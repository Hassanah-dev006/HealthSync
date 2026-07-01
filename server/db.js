const path = require("path");
const Database = require("better-sqlite3");
const config = require("./config");

const dbPath = path.join(__dirname, "..", config.dbFile);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id     TEXT PRIMARY KEY,
      name        TEXT,
      phone       TEXT,
      language    TEXT DEFAULT 'en',
      role        TEXT DEFAULT 'community_member',   -- community_member | chw | official
      village     TEXT,
      latitude    REAL,
      longitude   REAL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_facilities (
      facility_id TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT,                               -- hospital | health_center | health_post
      latitude    REAL NOT NULL,
      longitude   REAL NOT NULL,
      contact     TEXT,
      village     TEXT
    );

    CREATE TABLE IF NOT EXISTS symptom_reports (
      report_id    TEXT PRIMARY KEY,
      user_id      TEXT,
      reporter_name TEXT,
      reporter_phone TEXT,
      symptoms     TEXT NOT NULL,                     -- JSON array of symptom keys
      duration_days INTEGER DEFAULT 1,
      latitude     REAL NOT NULL,
      longitude    REAL NOT NULL,
      village      TEXT,
      language     TEXT DEFAULT 'en',
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      assessment_id TEXT PRIMARY KEY,
      report_id     TEXT NOT NULL,
      risk_level    TEXT NOT NULL,                    -- low | medium | high
      score         REAL NOT NULL,
      reasons       TEXT,                             -- JSON array of human-readable reasons
      assessed_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES symptom_reports(report_id)
    );

    CREATE TABLE IF NOT EXISTS clusters (
      cluster_id    TEXT PRIMARY KEY,
      centroid_lat  REAL NOT NULL,
      centroid_lng  REAL NOT NULL,
      case_count    INTEGER NOT NULL,
      radius_km     REAL NOT NULL,
      status        TEXT DEFAULT 'active',            -- active | resolved
      first_seen    TEXT DEFAULT (datetime('now')),
      last_updated  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      referral_id   TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      report_id     TEXT NOT NULL,
      facility_id   TEXT,
      chw_id        TEXT,
      distance_km   REAL,
      channel       TEXT DEFAULT 'sms',               -- sms | call
      status        TEXT DEFAULT 'pending',           -- pending | sent | failed
      message       TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assessment_id) REFERENCES risk_assessments(assessment_id),
      FOREIGN KEY (facility_id)  REFERENCES health_facilities(facility_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reports_created ON symptom_reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_assess_report  ON risk_assessments(report_id);
  `);
}

init();

module.exports = { db, init, dbPath };