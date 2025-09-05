const QuizQuestion = require('../models/QuizQuestion');
const UserQuestionTracker = require('../models/UserQuestionTracker');
const fs = require('fs');
const path = require('path');
const countPerBatch = parseInt(process.env.AI_BATCH_SIZE || '10');
const totalPerCategory = parseInt(process.env.AI_TOTAL_PER_CATEGORY || '30');
const cosineThreshold = parseFloat(process.env.EMBEDDING_THRESHOLD || '0.92');

// Generates 10 balanced (easy/medium/hard) questions unseen by the user
exports.generateQuestions = async (req, res) => {
  const userId = req.user.id;
  const { category } = req.body;

  try {
    // 1. Get list of question IDs already seen by user
    const seenIds = await UserQuestionTracker.find({ userId }).distinct(
      'questionId'
    );

    // 2. Define desired difficulty split
    const desired = [
      { difficulty: 'easy', count: 3 },
      { difficulty: 'medium', count: 4 },
      { difficulty: 'hard', count: 3 },
    ];

    const selected = [];

    // 3. Pick unseen questions by difficulty
    for (const { difficulty, count } of desired) {
      const questions = await QuizQuestion.aggregate([
        {
          $match: {
            category,
            difficulty,
            _id: { $nin: seenIds },
          },
        },
        { $sample: { size: count } },
      ]);
      selected.push(...questions);
    }

    // 4. Ensure we got exactly 10
    if (selected.length < 10) {
      return res.status(400).json({ message: 'Not enough unseen questions' });
    }

    // 5. Track these questions as seen
    const trackerDocs = selected.map((q) => ({
      userId,
      questionId: q._id,
    }));
    await UserQuestionTracker.insertMany(trackerDocs, { ordered: false });

    return res.json({ questions: selected });
  } catch (err) {
    console.error('❌ Error generating questions:', err);
    return res.status(500).json({ message: 'Failed to generate questions' });
  }
};

const categories = ['Science', 'General', 'History', 'Sports', 'Geography'];
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai ** 2, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi ** 2, 0));
  return dot / (normA * normB);
};

const getEmbeddings = async (texts) => {
  try {
    const results = [];

    for (const text of texts) {
      const response = await fetch(
        process.env.EMBEDDING_MODEL_API ||
          'http://216.225.206.71:11434/api/embeddings',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.EMBEDDING_MODEL_NAME || 'nomic-embed-text',
            prompt: text, // send ONE string
          }),
        }
      );

      const data = await response.json();

      if (!data || !Array.isArray(data.embedding)) {
        console.error('❌ Invalid embedding response:', JSON.stringify(data));
        throw new Error('Invalid embedding response structure');
      }

      results.push(data.embedding);
    }

    return results;
  } catch (err) {
    console.error('❌ Embedding fetch failed:', err.message);
    throw new Error('Embedding model failed');
  }
};

const promptTemplate = (count, category) => `
Generate exactly ${count} unique multiple choice questions on the topic of ${category}.
Avoid repeating common trivia. Ensure originality and variety.
Avoid ambiguous or too simple questions. Include questions from modern and global topics in ${category}.
Ensure each question has 4 distinct options and one correct answer.

Return only this JSON format:
[
  {
    "question": "Question text here",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct answer text here",
    "difficulty": "easy" // or "medium" or "hard"
  }
]
No explanations, markdown or notes.
`;

exports.generateAndSaveQuestions = async () => {
  try {
    for (const category of categories) {
      try {
        const batches = Math.ceil(totalPerCategory / countPerBatch);

        for (let i = 0; i < batches; i++) {
          console.log(
            `🚀 Generating ${countPerBatch} questions for ${category} (Batch ${
              i + 1
            })`
          );
          const prompt = promptTemplate(countPerBatch, category);

          const response = await fetch(
            `${process.env.OLLAMA_API}/api/generate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: process.env.OLLAMA_MODEL || 'mistral',
                prompt,
                stream: true,
              }),
            }
          );

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let completeText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                completeText += parsed.response || '';
              } catch {
                continue;
              }
            }
          }

          try {
            const start = completeText.indexOf('[');
            const end = completeText.lastIndexOf(']') + 1;
            if (start === -1 || end === -1)
              throw new Error('Missing JSON brackets');

            const jsonRaw = completeText
              .substring(start, end)
              .replace(/\/\/.*$/gm, '')
              .replace(/\s*\.\.\..*$/gm, '')
              .replace(/\\n/g, '')
              .trim();

            const parsed = JSON.parse(jsonRaw);
            if (!Array.isArray(parsed))
              throw new Error('Parsed output not array');

            const dbQuestions = await QuizQuestion.find({ category }).select(
              'question'
            );
            const oldQuestions = dbQuestions.map((q) => q.question);
            const oldEmbeds = oldQuestions.length
              ? await getEmbeddings(oldQuestions)
              : [];
            const newTexts = parsed.map((q) => q.question);
            const newEmbeds = await getEmbeddings(newTexts);

            const unique = [];
            for (let j = 0; j < parsed.length; j++) {
              const current = newEmbeds[j];
              const isDup = oldEmbeds.some(
                (e) => cosineSimilarity(current, e) >= cosineThreshold
              );
              if (!isDup) unique.push(parsed[j]);
            }

            if (unique.length) {
              const enriched = unique.map((q) => ({
                ...q,
                category,
                usedBy: [],
                usedCount: 0,
              }));
              await QuizQuestion.insertMany(enriched);
              console.log(
                `[${new Date().toISOString()}] ✅ Saved ${
                  enriched.length
                } new unique questions for ${category}`
              );
            } else {
              console.warn(
                `⚠️ No new semantic-unique questions for ${category} in batch ${
                  i + 1
                }`
              );
            }
          } catch (err) {
            const logDir = path.join(__dirname, '../logs/failures');
            fs.mkdirSync(logDir, { recursive: true });

            const logFile = path.join(
              logDir,
              `${category}-batch${i + 1}-${Date.now()}.txt`
            );
            fs.writeFileSync(logFile, completeText);

            console.error(
              `❌ JSON/Embedding error for ${category} batch ${i + 1}:`,
              err.message
            );
          }
        }
      } catch (err) {
        console.error(`❌ Skipping ${category} due to error:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Fatal Generator Error:', err.message || err);
  }
};
