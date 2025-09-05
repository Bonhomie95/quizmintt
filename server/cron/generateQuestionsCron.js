const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { generateAndSaveQuestions } = require('../controllers/quizController');

const logPath = path.join(__dirname, '../logs');
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath);
}

const logFile = path.join(logPath, 'cron.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

cron.schedule('0 */15 * * * *', async () => {
  try {
    const now = new Date().toLocaleTimeString();
    console.log(`⏱️ Running question generator at ${now}`);
    logToFile(`⏱️ Cron triggered at ${now} - Starting question generation...`);

    await generateAndSaveQuestions();

    logToFile('✅ Question generation completed successfully.');
  } catch (err) {
    logToFile(
      `❌ Error during question generation: ${err.stack || err.message}`
    );
  }
});
