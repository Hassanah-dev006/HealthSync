const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { listClusters } = require("../services/clustering");

// --- Facilities + CHWs ---
router.get("/facilities", (req, res) => {
  const facilities = db.prepare("SELECT * FROM health_facilities ORDER BY name").all();
  const chws = db
    .prepare("SELECT user_id, name, phone, village, latitude, longitude FROM users WHERE role = 'chw'")
    .all();
  res.json({ facilities, chws });
});

// --- Active clusters ---
router.get("/clusters", (req, res) => {
  res.json(listClusters());
});

// --- Referrals (most recent first) ---
router.get("/referrals", (req, res) => {
  const rows = db
    .prepare(
      `SELECT rf.referral_id, rf.distance_km, rf.channel, rf.status, rf.message, rf.created_at,
              f.name AS facility_name, f.village AS facility_village,
              r.reporter_name, r.village AS report_village
       FROM referrals rf
       LEFT JOIN health_facilities f ON f.facility_id = rf.facility_id
       LEFT JOIN symptom_reports r ON r.report_id = rf.report_id
       ORDER BY rf.created_at DESC
       LIMIT 100`
    )
    .all();
  res.json(rows);
});

// --- Headline statistics ---
router.get("/stats", (req, res) => {
  const totalReports = db.prepare("SELECT COUNT(*) n FROM symptom_reports").get().n;
  const byLevel = db
    .prepare("SELECT risk_level, COUNT(*) n FROM risk_assessments GROUP BY risk_level")
    .all()
    .reduce((acc, r) => ({ ...acc, [r.risk_level]: r.n }), { low: 0, medium: 0, high: 0 });
  const activeClusters = db.prepare("SELECT COUNT(*) n FROM clusters WHERE status = 'active'").get().n;
  const referrals = db.prepare("SELECT COUNT(*) n FROM referrals").get().n;
  const last24h = db
    .prepare("SELECT COUNT(*) n FROM symptom_reports WHERE created_at >= datetime('now','-24 hours')")
    .get().n;

  res.json({ totalReports, byLevel, activeClusters, referrals, last24h });
});

module.exports = router;