const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  user: String,           // Who submitted the feedback
  condition: String,      // "Like New", "Used - Good", etc.
  comment: String,        // Optional comment
  date: { type: Date, default: Date.now }
});

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  owner: String,
  likes: { type: Number, default: 0 },
  tags: [String],
  condition: { type: String, default: "Not Specified" },
  conditionHistory: [conditionSchema]  // Verified condition feedback
});

module.exports = mongoose.model('Book', bookSchema);
