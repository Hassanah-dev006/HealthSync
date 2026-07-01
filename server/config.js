require("./loadEnv"); // tiny .env loader (no external dependency)

module.exports = {
  port: parseInt(process.env.PORT || "3000", 10),

  // --- Clustering parameters ---
  cluster: {
    radiusKm: parseFloat(process.env.CLUSTER_RADIUS_KM || "1.5"), // group reports within this distance
    windowHours: parseInt(process.env.CLUSTER_WINDOW_HOURS || "168", 10), // look back 7 days
    minCases: parseInt(process.env.CLUSTER_MIN_CASES || "3", 10), // cases needed to declare a cluster
  },

  // --- Referral parameters ---
  referral: {
    // risk levels that automatically trigger a referral
    autoReferLevels: (process.env.AUTO_REFER_LEVELS || "high").split(","),
    maxFacilityDistanceKm: parseFloat(process.env.MAX_FACILITY_KM || "25"),
  },

  // --- SMS / voice gateway ---
  // If Twilio credentials are present the referral service sends real SMS,
  // otherwise it runs in SIMULATION mode (messages are logged + stored).
  sms: {
    provider: process.env.TWILIO_ACCOUNT_SID ? "twilio" : "simulation",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || null,
      authToken: process.env.TWILIO_AUTH_TOKEN || null,
      from: process.env.TWILIO_FROM || null,
    },
  },

  dbFile: process.env.DB_FILE || "malaria.db",
};