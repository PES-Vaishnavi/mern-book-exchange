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

    const validateToken = async () => {
      try {
        const res = await fetch("http://localhost:5000/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setToken(storedToken);
          setUsername(data.username);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
      }
    };

    if (storedToken) validateToken();
  }, []);

  useEffect(() => {
    if (token) fetchBooks();
  }, [token]);

  const fetchBooks = async () => {
    try {
      const res = await fetch("http://localhost:5000/books", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBooks(data);
    } catch {
      console.error("Failed to fetch books");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUsername(data.username);
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        setMessage("Logged in!");
        setError("");
      } else {
        setError(data.error || "Login failed");
        setMessage("");
      }
    } catch {
      setError("Login failed");
    }
  };

  const handleRegister = async () => {
    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Registered! Please login.");
        setError("");
        setIsRegistering(false);
      } else {
        setError(data.error || "Registration failed");
        setMessage("");
      }
    } catch {
      setError("Registration failed");
    }
  };

  const handleAddBook = async () => {
    if (!form.title || !form.author) return;
    try {
      const res = await fetch("http://localhost:5000/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: "", author: "" });
        fetchBooks();
      }
    } catch {
      console.error("Failed to add book");
    }
  };

  const handleExchangeRequest = async (bookId) => {
    try {
      const res = await fetch(`http://localhost:5000/exchange/${bookId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Exchange requested!");
        setError("");
        fetchBooks();
      } else {
        setError(data.error || "Exchange request failed");
        setMessage("");
      }
    } catch {
      setError("Exchange request failed due to network error");
      setMessage("");
    } 
  };

  const handleApprove = async (bookId, requesterId) => {
    try {
      const res = await fetch(`http://localhost:5000/approve/${bookId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requesterId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Exchange approved");
        setError("");
        fetchBooks();
      } else {
        setError(data.error || "Approval failed");
        setMessage("");
      }
    } catch {
      setError("Approval failed due to network error");
      setMessage("");
    }
  };
const handleReject = async (bookId, requesterId) => {
  try {
    const res = await fetch(`http://localhost:5000/reject/${bookId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requesterId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message || "Request rejected");
      setError("");
      fetchBooks();
    } else {
      setError(data.error || "Rejection failed");
      setMessage("");
    }
  } catch {
    setError("Rejection failed due to network error");
    setMessage("");
  }
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken("");
    setUsername("");
    setBooks([]);
  };

  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="App">
      <div className="App-content">
        <h1>📚 Book Exchange</h1>
        {!token ? (
          <>
            <h2>{isRegistering ? "Register" : "Login"}</h2>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={isRegistering ? handleRegister : handleLogin}>
              {isRegistering ? "Register" : "Login"}
            </button>
            <button onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? "Switch to Login" : "No account? Register"}
            </button>
          </>
        ) : (
          <>
            <h2>Welcome, {username}!</h2>
            <button onClick={handleLogout}>Logout</button>

            <h3>Add Book</h3>
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              placeholder="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <button onClick={handleAddBook}>Add</button>

            <h3>Books</h3>
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ul>
              {filteredBooks.map((book) => (
                <li key={book._id}>
                  <strong>{book.title}</strong> by {book.author} <br />
                  <em>Owner: {book.ownerUsername || "Unknown"}</em>
                  <br />
                  {book.ownerUsername !== username ? (
                    book.pendingRequests?.some(r => r.username === username) ? (
                      <p style={{ color: "yellow" }}>Request Pending</p>
                    ) : (
                      <button onClick={() => handleExchangeRequest(book._id)}>
                        Request Exchange
                      </button>
                    )
                  ) : (
                    book.pendingRequests?.map((r) => (
                      <div key={r.id}>
                        Request by {r.username}
                        <button onClick={() => handleApprove(book._id, r.id)}>Approve</button>
<button onClick={() => handleReject(book._id, r.id)} style={{ marginLeft: "8px", backgroundColor: "#ff7070" }}>
  Reject
</button>

                      </div>
                    ))
                  )}
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
