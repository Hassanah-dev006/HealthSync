const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { id } = require("../services/geo");
const riskEngine = require("../services/riskEngine");
const { createReferral } = require("../services/referral");
const { refreshClusters } = require("../services/clustering");
const config = require("../config");

router.post("/", async (req, res) => {
  try {
    const {
      symptoms = [],
      durationDays = 1,
      latitude,
      longitude,
      name = null,
      phone = null,
      village = null,
      language = "en",
    } = req.body || {};

    // --- validation ---
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ error: "Please select at least one symptom." });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "A location (latitude & longitude) is required." });
    }

    // --- 1. store the report ---
    const reportId = id("rpt");
    db.prepare(
      `INSERT INTO symptom_reports
         (report_id, reporter_name, reporter_phone, symptoms, duration_days, latitude, longitude, village, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(reportId, name, phone, JSON.stringify(symptoms), durationDays, latitude, longitude, village, language);

    // --- 2. assess risk ---
    const assessment = riskEngine.assess(symptoms, durationDays);
    const assessmentId = id("asm");
    db.prepare(
      `INSERT INTO risk_assessments (assessment_id, report_id, risk_level, score, reasons)
       VALUES (?, ?, ?, ?, ?)`
    ).run(assessmentId, reportId, assessment.level, assessment.score, JSON.stringify(assessment.reasons));

    const report = db.prepare("SELECT * FROM symptom_reports WHERE report_id = ?").get(reportId);

    // --- 3. rapid-response referral for high-risk (or configured levels) ---
    let referral = null;
    if (config.referral.autoReferLevels.includes(assessment.level)) {
      referral = await createReferral({
        report,
        assessment: { assessment_id: assessmentId, ...assessment },
      });
    }

    // --- 4. refresh clusters (real-time outbreak detection) ---
    refreshClusters();

    res.status(201).json({
      reportId,
      assessment: {
        level: assessment.level,
        score: assessment.score,
        reasons: assessment.reasons,
      },
      referral: referral
        ? {
            facilityId: referral.facility_id,
            distanceKm: referral.distance_km,
            channel: referral.channel,
            status: referral.status,
            message: referral.message,
          }
        : null,
    });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    res.status(500).json({ error: "Something went wrong saving the report." });
  }
});

router.get("/", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
  const rows = db
    .prepare(
      `SELECT r.report_id, r.reporter_name, r.symptoms, r.duration_days,
              r.latitude, r.longitude, r.village, r.created_at,
              a.risk_level, a.score, a.reasons
       FROM symptom_reports r
       LEFT JOIN risk_assessments a ON a.report_id = r.report_id
       ORDER BY r.created_at DESC
       LIMIT ?`
    )
    .all(limit)
    .map((r) => ({
      ...r,
      symptoms: JSON.parse(r.symptoms || "[]"),
      reasons: JSON.parse(r.reasons || "[]"),
    }));
  res.json(rows);
});

module.exports = router;