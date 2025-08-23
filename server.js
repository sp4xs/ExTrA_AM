// server.js
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (login.html, dashboard.html, css, js, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Sessions
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

// Database setup
const db = new sqlite3.Database("database.db");

// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);

// Create uploads folder if not exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Redirect root → login
app.get("/", (req, res) => {
  res.redirect("/login.html"); // serve login.html directly
});

// Handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err) {
        return res.status(500).send("Database error");
      }
      if (!user) {
        return res.send("Invalid login <a href='/login.html'>Try again</a>");
      }

      // Save session
      req.session.user = { username: user.username, role: user.role };
      res.redirect("/dashboard.html");
    }
  );
});

// Protect dashboard.html (must be logged in)
app.get("/dashboard.html", (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next(); // let Express serve dashboard.html normally
});

// User info API (for watermark, etc.)
app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json({ username: req.session.user.username });
});

// Serve files inline (view-only, no download)
app.get("/view/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.setHeader("Content-Disposition", "inline");
  res.sendFile(filePath);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
