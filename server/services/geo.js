/**
 * Small geo + id utilities shared across services.
 */
const crypto = require("crypto");

/** Haversine great-circle distance between two lat/lng points, in km. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Short, readable unique id with a prefix, e.g. rpt_a1b2c3d4 */
function id(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

module.exports = { haversineKm, id };