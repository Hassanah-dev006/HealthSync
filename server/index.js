const path = require("path");
const express = require("express");
const config = require("./config");
const { db } = require("./db");
const { SYMPTOMS } = require("./services/riskEngine");

// Auto-seed on first run so the app is never empty.
const seed = require("./seed/run");
const facilityCount = db.prepare("SELECT COUNT(*) n FROM health_facilities").get().n;
if (facilityCount === 0) {
  console.log("First run detected — seeding database...");
  seed.run();
}

const app = express();
app.use(express.json());

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
app.use("/api/reports", require("./routes/reports"));
app.use("/api", require("./routes/dashboard"));

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
  console.log(`  Dashboard:        http://localhost:${config.port}/dashboard.html`);
  console.log(`  SMS mode:         ${config.sms.provider.toUpperCase()}`);
  console.log("  ------------------------------------------------\n");
});