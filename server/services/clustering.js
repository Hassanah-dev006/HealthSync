const { db } = require("../db");
const { haversineKm, id } = require("./geo");
const config = require("../config");

function recentReports() {
  // medium/high reports drive outbreak detection
  return db
    .prepare(
      `SELECT r.report_id, r.latitude, r.longitude, r.created_at, a.risk_level
       FROM symptom_reports r
       JOIN risk_assessments a ON a.report_id = r.report_id
       WHERE a.risk_level IN ('high','medium')
         AND r.created_at >= datetime('now', ?)
       ORDER BY r.created_at DESC`
    )
    .all(`-${config.cluster.windowHours} hours`);
}

/** Greedy clustering: each report joins the first cluster whose centroid is
 *  within radiusKm, otherwise it seeds a new candidate cluster. */
function computeClusters() {
  const reports = recentReports();
  const { radiusKm, minCases } = config.cluster;
  const candidates = [];

  for (const r of reports) {
    let placed = false;
    for (const c of candidates) {
      if (haversineKm(c.lat, c.lng, r.latitude, r.longitude) <= radiusKm) {
        c.points.push(r);
        // recompute centroid as running average
        c.lat = c.points.reduce((s, p) => s + p.latitude, 0) / c.points.length;
        c.lng = c.points.reduce((s, p) => s + p.longitude, 0) / c.points.length;
        placed = true;
        break;
      }
    }
    if (!placed) candidates.push({ lat: r.latitude, lng: r.longitude, points: [r] });
  }

  return candidates.filter((c) => c.points.length >= minCases);
}

/** Recompute clusters and persist them (replacing the active set). */
function refreshClusters() {
  const found = computeClusters();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM clusters WHERE status = 'active'").run();
    const insert = db.prepare(
      `INSERT INTO clusters (cluster_id, centroid_lat, centroid_lng, case_count, radius_km, status)
       VALUES (?, ?, ?, ?, ?, 'active')`
    );
    for (const c of found) {
      // cluster radius = distance from centroid to its farthest member (min 0.3km)
      const maxD = Math.max(
        0.3,
        ...c.points.map((p) => haversineKm(c.lat, c.lng, p.latitude, p.longitude))
      );
      insert.run(id("clu"), c.lat, c.lng, c.points.length, +maxD.toFixed(2));
    }
  });
  tx();

  return found.length;
}

function listClusters() {
  return db.prepare("SELECT * FROM clusters WHERE status = 'active' ORDER BY case_count DESC").all();
}

module.exports = { refreshClusters, listClusters, computeClusters };