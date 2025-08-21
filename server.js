const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const port = 3000;

// Middleware to handle form data
app.use(bodyParser.urlencoded({ extended: true }));

// Setup session middleware
app.use(
  session({
    secret: "my-secret-key", // change this to something random
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files (only for login and public assets)
app.use(express.static(path.join(__dirname, "public")));

// Fake user credentials
const USERNAME = "admin";
const PASSWORD = "1234";

// Route: GET login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Route: POST login form
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === USERNAME && password === PASSWORD) {
    // Save login status in session
    req.session.loggedIn = true;
    res.redirect("/dashboard");
  } else {
    res.send(`
      <h2>Login Failed</h2>
      <p>Wrong username or password</p>
      <a href="/">Try again</a>
    `);
  }
});

// Route: GET dashboard (protected)
app.get("/dashboard", (req, res) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } else {
    res.redirect("/");
  }
});

// Route: Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`🌐 Access from other devices at http://YOUR-IP:${port}`);
});
