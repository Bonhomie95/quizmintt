const mongoose = require('mongoose');

const userQuestionTrackerSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  questionId: mongoose.Types.ObjectId,
});

module.exports = mongoose.model('UserQuestionTracker', userQuestionTrackerSchema);
