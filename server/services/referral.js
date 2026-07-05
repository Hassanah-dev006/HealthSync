const { db } = require("../db");
const { haversineKm, id } = require("./geo");
const config = require("../config");

function nearestFacility(lat, lng) {
  const facilities = db.prepare("SELECT * FROM health_facilities").all();
  let best = null;
  for (const f of facilities) {
    if (f.latitude == null || f.longitude == null) continue;
    const d = haversineKm(lat, lng, f.latitude, f.longitude);
    if (!best || d < best.distance) best = { facility: f, distance: d };
  }
  return best;
}

function nearestCHW(lat, lng) {
  const chws = db.prepare("SELECT * FROM users WHERE role = 'chw'").all();
  let best = null;
  for (const c of chws) {
    if (c.latitude == null || c.longitude == null) continue;
    const d = haversineKm(lat, lng, c.latitude, c.longitude);
    if (!best || d < best.distance) best = { chw: c, distance: d };
  }
  return best;
}

function buildMessage({ facility, distanceKm, reporterName, language }) {
  const name = reporterName || (language === "rw" ? "umurwayi" : "a patient");
  const dist = distanceKm.toFixed(1);
  if (language === "rw") {
    return (
      `IKIBAZO GIKOMEYE cya malariya: ${name} afite ibimenyetso bikomeye. ` +
      `Ivuriro rikuri hafi ni ${facility.name} (~${dist} km). ` +
      `Nyamuneka mwihutire kuvuza no kwipimisha malariya.`
    );
  }
  return (
    `HIGH-RISK malaria alert: ${name} has reported serious symptoms. ` +
    `Nearest facility: ${facility.name} (~${dist} km). ` +
    `Please seek care and a malaria test urgently.`
  );
}

/** Actually deliver the SMS (or simulate it). Returns {status, channel}. */
async function deliver(toPhone, message) {
  if (config.sms.provider === "twilio") {
    try {
      const twilio = require("twilio");
      const client = twilio(config.sms.twilio.accountSid, config.sms.twilio.authToken);
      await client.messages.create({ body: message, from: config.sms.twilio.from, to: toPhone });
      return { status: "sent", channel: "sms" };
    } catch (err) {
      console.error("[referral] Twilio send failed:", err.message);
      return { status: "failed", channel: "sms" };
    }
  }
  // SIMULATION mode
  console.log("\n──────── SIMULATED SMS REFERRAL ────────");
  console.log("To:     ", toPhone || "(facility / CHW line)");
  console.log("Message:", message);
  console.log("────────────────────────────────────────\n");
  return { status: "sent", channel: "sms" };
}

/**
 * Create + send a referral for a high-risk report.
 * @returns referral row (or null if no facility within range)
 */
async function createReferral({ report, assessment }) {
  const fac = nearestFacility(report.latitude, report.longitude);
  if (!fac || fac.distance > config.referral.maxFacilityDistanceKm) return null;

  const chw = nearestCHW(report.latitude, report.longitude);
  const message = buildMessage({
    facility: fac.facility,
    distanceKm: fac.distance,
    reporterName: report.reporter_name,
    language: report.language,
  });

  // Send to the facility line (and we would also notify the CHW in production)
  const toPhone = fac.facility.contact;
  const result = await deliver(toPhone, message);

  const referralId = id("ref");
  db.prepare(
    `INSERT INTO referrals
       (referral_id, assessment_id, report_id, facility_id, chw_id, distance_km, channel, status, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    referralId,
    assessment.assessment_id,
    report.report_id,
    fac.facility.facility_id,
    chw ? chw.chw.user_id : null,
    +fac.distance.toFixed(2),
    result.channel,
    result.status,
    message
  );

  return db.prepare("SELECT * FROM referrals WHERE referral_id = ?").get(referralId);
}

module.exports = { createReferral, nearestFacility, nearestCHW };