const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("./db");

const router = express.Router();

/** Look up an official account by username. */
function findOfficialByUsername(username) {
  return db
    .prepare("SELECT * FROM users WHERE username = ? AND role = 'official'")
    .get(username);
}

/* ---------------- API: /api/auth/* ---------------- */

// POST /api/auth/login  { username, password }
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const user = findOfficialByUsername(String(username).trim());
  // Compare against the stored hash. A generic message avoids revealing
  // whether it was the username or the password that was wrong.
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  // Store only what we need in the session.
  req.session.user = { id: user.user_id, name: user.name, role: user.role };
  res.json({ ok: true, name: user.name, role: user.role });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me  -> current session user, or 401
router.get("/me", (req, res) => {
  if (req.session && req.session.user) return res.json(req.session.user);
  res.status(401).json({ error: "Not authenticated." });
});

/* ---------------- Guards ---------------- */

// API guard: returns 401 JSON if the caller is not a logged-in official.
function requireOfficial(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "official") {
    return next();
  }
  return res.status(401).json({ error: "Officials only. Please log in." });
}

// Page guard: redirects browsers to the login page instead of returning JSON.
function requireOfficialPage(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "official") {
    return next();
  }
  return res.redirect("/login.html");
}

module.exports = { router, requireOfficial, requireOfficialPage };