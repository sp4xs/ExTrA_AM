// initDB.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./database.db");

// Create users table
db.serialize(() => {
  db.run("DROP TABLE IF EXISTS users"); // reset each time you run
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  // Insert example users
  const insert = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");

  // Developer (admin) user
  bcrypt.hash("dev123", 10, (err, hash) => {
    insert.run("admin", hash, "dev");
  });

  // Normal user
  bcrypt.hash("user123", 10, (err, hash) => {
    insert.run("alice", hash, "user");
  });

  insert.finalize();
});

db.close();
