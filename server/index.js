/**
 * Application entry point.
 *
 * Serves the REST API under /api and the front-end (reporter app + dashboard)
 * as static files from /public. One process, one command: `npm start`.
 */
const path = require("path");
const express = require("express");
const session = require("express-session");
const config = require("./config");
const { db } = require("./db");
const { SYMPTOMS } = require("./services/riskEngine");
const { router: authRouter, requireOfficial, requireOfficialPage } = require("./auth");

// Auto-seed on first run so the app is never empty.
const seed = require("./seed/run");
const facilityCount = db.prepare("SELECT COUNT(*) n FROM health_facilities").get().n;
if (facilityCount === 0) {
  console.log("First run detected — seeding database...");
  seed.run();
}
// Ensure official login accounts exist even when upgrading an older database
// that already had facilities (so the first-run seed above did not fire).
const officialCount = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'official'").get().n;
if (officialCount === 0) {
  console.log("No official accounts found — seeding login accounts...");
  seed.seedOfficials();
}

const app = express();
app.use(express.json());

// Sessions (signed httpOnly cookie). Officials log in; residents do not.
app.use(
  session({
    name: "healthsync.sid",
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }, // 8h
  })
);

// Simple request logger
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) console.log(`${req.method} ${req.path}`);
  next();
});

// --- API routes ---
app.get("/api/health", (_req, res) => res.json({ ok: true, mode: config.sms.provider }));
// Expose the symptom catalogue so the front-end stays in sync with the engine
app.get("/api/symptoms", (_req, res) => {
  res.json(
    Object.entries(SYMPTOMS).map(([key, v]) => ({ key, danger: v.danger }))
  );
});

// Authentication (public: login/logout/me)
app.use("/api/auth", authRouter);

// Public: residents submit reports without an account.
app.use("/api/reports", require("./routes/reports"));

// Protected: the surveillance dashboard data is for logged-in officials only.
app.use("/api", requireOfficial, require("./routes/dashboard"));

// --- Protected dashboard page (must come BEFORE express.static) ---
// Browsers hitting /dashboard.html without a session are redirected to login.
app.get("/dashboard.html", requireOfficialPage, (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
});

// --- Static front-end ---
app.use(express.static(path.join(__dirname, "..", "public")));

// Fallback to landing page for any unmatched GET (works on Express 4 and 5)
app.use((req, res) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  }
  res.status(404).json({ error: "Not found" });
});

app.listen(config.port, () => {
  console.log("\n  Malaria Early Detection & Rapid Response System");
  console.log("  ------------------------------------------------");
  console.log(`  Server running:   http://localhost:${config.port}`);
  console.log(`  Reporter app:     http://localhost:${config.port}/report.html`);
  console.log(`  Dashboard:        http://localhost:${config.port}/dashboard.html  (login required)`);
  console.log(`  Official login:   http://localhost:${config.port}/login.html`);
  console.log(`  Demo account:     ${config.auth.officials[0].username} / ${config.auth.officials[0].password}`);
  console.log(`  SMS mode:         ${config.sms.provider.toUpperCase()}`);
  console.log("  ------------------------------------------------\n");
});
