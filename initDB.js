// initDB.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('dev', 'user'))
  )
`, (err) => {
  if (err) {
    console.error("Error creating table:", err);
    return;
  }

  console.log("Users table ready.");

  // Insert default users safely
  const defaultUsers = [
    { username: "admin", password: "1234", role: "dev" },
    { username: "user", password: "1234", role: "user" }
  ];

  defaultUsers.forEach(user => {
    db.run(
      "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
      [user.username, user.password, user.role],
      (err) => {
        if (err) console.error(`Failed to add user ${user.username}:`, err);
        else console.log(`User ${user.username} ready.`);
      }
    );
  });
});

// Close DB after all inserts
db.close();
