const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const db = new sqlite3.Database("./database.db");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: true,
}));

// Multer for uploads
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- DATABASE INIT ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `, () => {
    // Check if table is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row.count === 0) {
        // Insert default users
        bcrypt.hash("dev123", 10, (err, hash) => {
          db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ["admin", hash, "dev"]);
        });
        bcrypt.hash("user123", 10, (err, hash) => {
          db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ["alice", hash, "user"]);
        });
        console.log("Default users created: admin/dev123, alice/user123");
      }
    });
  });
});

// --- LOGIN ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.send("Database error");
    if (!user) return res.send("User not found");

    bcrypt.compare(password, user.password, (err, match) => {
      if (match) {
        req.session.user = { username: user.username, role: user.role };
        res.redirect("/dashboard.html");
      } else {
        res.send("Invalid password");
      }
    });
  });
});

// --- MIDDLEWARE ---
function authMiddleware(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}
function devOnly(req, res, next) {
  if (!req.session.user || req.session.user.role !== "dev") {
    return res.status(403).send("Access denied. Developers only!");
  }
  next();
}

// --- ROUTES ---
// Dashboard
app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

// Session info
app.get("/session", (req, res) => {
  res.json(req.session.user || {});
});

// File upload (dev only)
app.post("/upload", devOnly, upload.single("file"), (req, res) => {
  res.send("File uploaded successfully: " + req.file.filename);
});

// File list
app.get("/files", authMiddleware, (req, res) => {
  fs.readdir("./uploads", (err, files) => {
    if (err) return res.send("Error reading files");
    res.json(files);
  });
});

// File view (read-only)
app.get("/view/:filename", authMiddleware, (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  res.sendFile(filePath);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

// Start server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running at http://localhost:3000");
});

// Login
app.get("/", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});



app.use(bodyParser.json());

// --- DELETE FILE (Dev only) ---
app.delete("/file/:filename", devOnly, (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  fs.unlink(filePath, err => {
    if (err) return res.status(500).send("Error deleting file");
    res.send("File deleted");
  });
});

// --- RENAME FILE (Dev only) ---
app.put("/file/:filename", devOnly, (req, res) => {
  const oldPath = path.join(__dirname, "uploads", req.params.filename);
  const newName = req.body.newName;
  const newPath = path.join(__dirname, "uploads", newName);
  fs.rename(oldPath, newPath, err => {
    if (err) return res.status(500).send("Error renaming file");
    res.send("File renamed");
  });
});
