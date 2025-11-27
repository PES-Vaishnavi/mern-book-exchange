const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pendingRequests: [
    {
      id: String,
      username: String 
    }
  ]
});

module.exports = mongoose.model("Book", bookSchema);
