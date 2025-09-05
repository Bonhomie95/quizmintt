require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Adjust this path based on your project structure
const QuizQuestion = require(path.join(__dirname, '../models/QuizQuestion'));

(async () => {
  const uri = "mongodb+srv://joe:Done123@cluster0.fczza.mongodb.net/quizmint?retryWrites=true&w=majority";

  if (!uri) {
    console.error('❌ Missing MONGO_URI in .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await QuizQuestion.deleteMany({});
    console.log(`✅ Purged ${result.deletedCount} questions.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to purge:', err.message);
    process.exit(1);
  }
})();
