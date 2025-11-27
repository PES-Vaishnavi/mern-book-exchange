const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config(); 

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

mongoose.connect("mongodb://localhost:27017/book-exchange");

const User = require("./models/User");
const Book = require("./models/Book");

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

app.get("/verify", auth, (req, res) => {
  res.json({ username: req.user.username });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashed });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Login failed due to server error" });
  }
});

app.get("/books", auth, async (req, res) => {
  const books = await Book.find().populate("owner", "username");
  res.json(
    books.map((b) => ({
      _id: b._id,
      title: b.title,
      author: b.author,
      ownerUsername: b.owner?.username,
      ownerId: b.owner?._id,
      pendingRequests: b.pendingRequests,
    }))
  );
});

app.post("/books", auth, async (req, res) => {
  const book = await Book.create({
    title: req.body.title,
    author: req.body.author,
    owner: req.user.id,
  });
  res.status(201).json(book);
});

app.post("/exchange/:id", auth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  if (book.owner.equals(req.user.id)) {
    return res.status(400).json({ error: "You cannot request your own book" });
  }

  const alreadyRequested = book.pendingRequests.some(r => r.id === req.user.id);
  if (alreadyRequested) {
    return res.status(400).json({ error: "You already requested this book" });
  }

  book.pendingRequests.push({ id: req.user.id, username: req.user.username });
  await book.save();

  res.json({ message: "Exchange request submitted!" });
});

app.post("/approve/:id", auth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  if (!book.owner.equals(req.user.id)) {
    return res.status(403).json({ error: "Only the owner can approve exchanges" });
  }

  const { requesterId } = req.body;
  if (!requesterId) return res.status(400).json({ error: "Missing requesterId" });

  book.owner = requesterId;
  book.pendingRequests = [];
  await book.save();

  res.json({ message: "Exchange approved and book transferred" });
});
app.post("/reject/:id", auth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  if (!book.owner.equals(req.user.id)) {
    return res.status(403).json({ error: "Only the owner can reject exchanges" });
  }

  const { requesterId } = req.body;
  if (!requesterId) return res.status(400).json({ error: "Missing requesterId" });

  book.pendingRequests = book.pendingRequests.filter(r => r.id !== requesterId);
  await book.save();

  res.json({ message: "Request rejected" });
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
