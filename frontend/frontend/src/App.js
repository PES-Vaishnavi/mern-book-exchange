import React, { useState, useEffect } from "react";
import "./App.css";
 
function App() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ title: "", author: "" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      fetch("http://localhost:5000/verify", { headers: { Authorization: `Bearer ${storedToken}` } })
        .then(res => res.ok ? res.json().then(data => { setToken(storedToken); setUsername(data.username); }) : localStorage.clear())
        .catch(() => localStorage.clear());
    }
  }, []);

  useEffect(() => { if (token) fetchBooks(); }, [token]);

  const fetchBooks = async () => {
    const res = await fetch("http://localhost:5000/books", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBooks(data);
  };

  const handleLogin = async () => {
    const res = await fetch("http://localhost:5000/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) { setToken(data.token); setUsername(data.username); localStorage.setItem("token", data.token); setMessage("Logged in!"); setError(""); } 
    else { setError(data.error); setMessage(""); }
  };

  const handleRegister = async () => {
    const res = await fetch("http://localhost:5000/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (res.ok) { setMessage("Registered! Please login."); setIsRegistering(false); setError(""); } 
    else { setError(data.error); setMessage(""); }
  };

  const handleAddBook = async () => {
    if (!form.title || !form.author) return;
    const res = await fetch("http://localhost:5000/books", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    if (res.ok) { setForm({ title: "", author: "" }); fetchBooks(); }
  };

  const handleExchangeRequest = async (bookId) => {
    const res = await fetch(`http://localhost:5000/exchange/${bookId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    res.ok ? (setMessage(data.message), setError(""), fetchBooks()) : (setError(data.error), setMessage(""));
  };

  const handleApprove = async (bookId, requesterId) => {
    const res = await fetch(`http://localhost:5000/approve/${bookId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requesterId }) });
    const data = await res.json();
    res.ok ? (setMessage(data.message), setError(""), fetchBooks()) : (setError(data.error), setMessage(""));
  };

  const handleReject = async (bookId, requesterId) => {
    const res = await fetch(`http://localhost:5000/reject/${bookId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requesterId }) });
    const data = await res.json();
    res.ok ? (setMessage(data.message), setError(""), fetchBooks()) : (setError(data.error), setMessage(""));
  };

  const handleUpdateCondition = async (bookId) => {
    const condition = prompt("Enter book condition (Like New / Used - Good / Used - Fair):");
    if (!condition) return;
    const res = await fetch(`http://localhost:5000/books/${bookId}/update-condition`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ condition }) });
    const data = await res.json();
    if (res.success) fetchBooks();
  };

  const handleSubmitFeedback = async (bookId) => {
    const condition = prompt("Enter received book condition:");
    const comment = prompt("Optional comment:");
    const res = await fetch(`http://localhost:5000/books/${bookId}/condition-feedback`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ user: username, condition, comment }) });
    const data = await res.json();
    if (res.success) alert("Feedback submitted!");
  };

  const handleViewFeedback = async (bookId) => {
    const res = await fetch(`http://localhost:5000/books/${bookId}/condition-history`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.length) { alert("No feedback yet!"); return; }
    alert(data.map(f => `${f.user}: ${f.condition} (${f.comment || "No comment"})`).join("\n"));
  };

  const handleLogout = () => { localStorage.clear(); setToken(""); setUsername(""); setBooks([]); };

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="App">
      <div className="App-content">
        <h1>📚 Book Exchange</h1>
        {!token ? (
          <>
            <h2>{isRegistering ? "Register" : "Login"}</h2>
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={isRegistering ? handleRegister : handleLogin}>{isRegistering ? "Register" : "Login"}</button>
            <button onClick={() => setIsRegistering(!isRegistering)}>{isRegistering ? "Switch to Login" : "No account? Register"}</button>
          </>
        ) : (
          <>
            <h2>Welcome, {username}!</h2>
            <button onClick={handleLogout}>Logout</button>

            <h3>Add Book</h3>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
            <button onClick={handleAddBook}>Add</button>

            <h3>Books</h3>
            <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <ul>
              {filteredBooks.map(book => (
                <li key={book._id}>
                  <strong>{book.title}</strong> by {book.author} <br />
                  <em>Owner: {book.ownerUsername || "Unknown"}</em><br />
                  <em>Condition: {book.condition}</em><br />
                  {book.ownerUsername !== username ? (
                    book.pendingRequests?.some(r => r.username === username) ? <p style={{color:"yellow"}}>Request Pending</p> :
                    <button onClick={() => handleExchangeRequest(book._id)}>Request Exchange</button>
                  ) : (
                    book.pendingRequests?.map(r => (
                      <div key={r.id}>
                        Request by {r.username}
                        <button onClick={() => handleApprove(book._id, r.id)}>Approve</button>
                        <button onClick={() => handleReject(book._id, r.id)} style={{marginLeft:"8px", backgroundColor:"#ff7070"}}>Reject</button>
                      </div>
                    ))
                  )}
                  {book.ownerUsername === username && <button onClick={() => handleUpdateCondition(book._id)}>Update Condition</button>}
                  <button onClick={() => handleSubmitFeedback(book._id)}>Submit Feedback</button>
                  <button onClick={() => handleViewFeedback(book._id)}>View Feedback</button>
                </li>
              ))}
            </ul>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
