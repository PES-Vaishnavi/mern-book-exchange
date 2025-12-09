const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config(); 

const app = express();
const PORT = process.env.PORT || 4000;
app.use(express.json());
//app.use(cors({ origin: "http://localhost:3000" }));
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
//mongoose.connect("mongodb://localhost:27017/book-exchange");

const User = require("./models/User");
const Book = require("./models/Book");

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// ------------------ User Routes ------------------
app.get("/verify", auth, (req, res) => res.json({ username: req.user.username }));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (await User.findOne({ username })) return res.status(400).json({ error: "Username already exists" });
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashed });
    res.status(201).json({ message: "User registered successfully" });
  } catch { res.status(500).json({ error: "Server error during registration" }); }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: "Incorrect password" });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch { res.status(500).json({ error: "Login failed due to server error" }); }
});

// ------------------ Book Routes ------------------
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
      condition: b.condition
    }))
  );
});

app.post("/books", auth, async (req, res) => {
  const book = await Book.create({
    title: req.body.title,
    author: req.body.author,
    owner: req.user.id
  });
  res.status(201).json(book);
});

// Exchange request
app.post("/exchange/:id", auth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (book.owner.equals(req.user.id)) return res.status(400).json({ error: "You cannot request your own book" });
  if (book.pendingRequests.some(r => r.id === req.user.id)) return res.status(400).json({ error: "You already requested this book" });

  book.pendingRequests.push({ id: req.user.id, username: req.user.username });
  await book.save();
  res.json({ message: "Exchange request submitted!" });
});

// Approve / Reject
app.post("/approve/:id", auth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (!book.owner.equals(req.user.id)) return res.status(403).json({ error: "Only the owner can approve exchanges" });

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
  if (!book.owner.equals(req.user.id)) return res.status(403).json({ error: "Only the owner can reject exchanges" });

  const { requesterId } = req.body;
  book.pendingRequests = book.pendingRequests.filter(r => r.id !== requesterId);
  await book.save();
  res.json({ message: "Request rejected" });
});

// ------------------ Verified Condition & Feedback ------------------
app.post('/books/:id/update-condition', auth, async (req, res) => {
  const { condition } = req.body;
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).send("Book not found");

    book.condition = condition;
    await book.save();
    res.json({ success: true, condition: book.condition });
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/books/:id/condition-feedback', auth, async (req, res) => {
  const { user, condition, comment } = req.body;
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).send("Book not found");

    book.conditionHistory.push({ user, condition, comment });
    await book.save();
    res.json({ success: true, conditionHistory: book.conditionHistory });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/books/:id/condition-history', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).send("Book not found");

    res.json(book.conditionHistory);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
