const { db } = require("../db");
const { facilities, chws } = require("./facilities");
const { id } = require("../services/geo");
const riskEngine = require("../services/riskEngine");
const { refreshClusters } = require("../services/clustering");

function seedFacilitiesAndChws() {
  const insFac = db.prepare(
    `INSERT OR REPLACE INTO health_facilities
       (facility_id, name, type, latitude, longitude, contact, village)
     VALUES (@facility_id, @name, @type, @latitude, @longitude, @contact, @village)`
  );
  const insChw = db.prepare(
    `INSERT OR REPLACE INTO users
       (user_id, name, phone, role, village, latitude, longitude)
     VALUES (@user_id, @name, @phone, @role, @village, @latitude, @longitude)`
  );
  const tx = db.transaction(() => {
    facilities.forEach((f) => insFac.run(f));
    chws.forEach((c) => insChw.run(c));
  });
  tx();
  console.log(`Seeded ${facilities.length} facilities and ${chws.length} CHWs.`);
}

/** A handful of demo reports clustered near Bumbogo to show an outbreak. */
function seedDemoReports() {
  const demo = [
    { symptoms: ["fever", "chills", "headache"], duration: 3, lat: -1.9050, lng: 30.1180, village: "Bumbogo", name: "Demo: Bumbogo case 1" },
    { symptoms: ["fever", "chills"],             duration: 2, lat: -1.9061, lng: 30.1169, village: "Bumbogo", name: "Demo: Bumbogo case 2" },
    { symptoms: ["fever", "headache", "sweating"],duration: 2, lat: -1.9043, lng: 30.1192, village: "Bumbogo", name: "Demo: Bumbogo case 3" },
    { symptoms: ["fever", "fatigue"],            duration: 1, lat: -1.9290, lng: 30.1262, village: "Kimironko", name: "Demo: Kimironko case 1" },
    { symptoms: ["headache"],                    duration: 1, lat: -1.9197, lng: 30.0807, village: "Gisozi", name: "Demo: Gisozi case 1" },
  ];

  const insReport = db.prepare(
    `INSERT INTO symptom_reports
       (report_id, reporter_name, symptoms, duration_days, latitude, longitude, village, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'en')`
  );
  const insAssess = db.prepare(
    `INSERT INTO risk_assessments (assessment_id, report_id, risk_level, score, reasons)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const d of demo) {
      const reportId = id("rpt");
      insReport.run(reportId, d.name, JSON.stringify(d.symptoms), d.duration, d.lat, d.lng, d.village);
      const a = riskEngine.assess(d.symptoms, d.duration);
      insAssess.run(id("asm"), reportId, a.level, a.score, JSON.stringify(a.reasons));
    }
  });
  tx();
  refreshClusters();
  console.log(`Seeded ${demo.length} demo reports and refreshed clusters.`);
}

function reset() {
  db.exec(`
    DELETE FROM referrals;
    DELETE FROM risk_assessments;
    DELETE FROM symptom_reports;
    DELETE FROM clusters;
    DELETE FROM users;
    DELETE FROM health_facilities;
  `);
  console.log("Database wiped.");
}

function run() {
  const args = process.argv.slice(2);
  if (args.includes("--reset")) reset();
  seedFacilitiesAndChws();
  const reportCount = db.prepare("SELECT COUNT(*) n FROM symptom_reports").get().n;
  if (reportCount === 0) seedDemoReports();
  console.log("Seed complete.");
}

// Only run automatically when invoked directly
if (require.main === module) run();

module.exports = { seedFacilitiesAndChws, seedDemoReports, reset, run };