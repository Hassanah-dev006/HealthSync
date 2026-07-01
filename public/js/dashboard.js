/* Dashboard: live map of reports, outbreak clusters, facilities, referrals. */
(function () {
  const KIGALI = [-1.9441, 30.0619];
  const COLORS = { high: "#c0392b", medium: "#e67e22", low: "#27ae60" };
  let map, layers;

  const $ = (id) => document.getElementById(id);

  function initMap() {
    map = L.map("map").setView(KIGALI, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    layers = {
      reports: L.layerGroup().addTo(map),
      facilities: L.layerGroup().addTo(map),
      clusters: L.layerGroup().addTo(map),
    };
  }

  function timeAgo(iso) {
    const then = new Date(iso.replace(" ", "T") + "Z").getTime();
    const mins = Math.round((Date.now() - then) / 60000);
    if (isNaN(mins)) return "";
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const h = Math.round(mins / 60);
    if (h < 24) return h + "h ago";
    return Math.round(h / 24) + "d ago";
  }

  async function refresh() {
    try {
      const [stats, reports, clusters, refs, facData] = await Promise.all([
        window.api.get("/api/stats"),
        window.api.get("/api/reports?limit=300"),
        window.api.get("/api/clusters"),
        window.api.get("/api/referrals"),
        window.api.get("/api/facilities"),
      ]);
      renderStats(stats);
      renderMap(reports, clusters, facData.facilities);
      renderClusters(clusters);
      renderReferrals(refs);
      renderReports(reports);
    } catch (err) {
      console.error("Dashboard refresh failed:", err);
    }
  }

  function renderStats(s) {
    $("sTotal").textContent = s.totalReports;
    $("s24h").textContent = s.last24h;
    $("sHigh").textContent = s.byLevel.high || 0;
    $("sClusters").textContent = s.activeClusters;
  }

  function renderMap(reports, clusters, facilities) {
    layers.reports.clearLayers();
    layers.facilities.clearLayers();
    layers.clusters.clearLayers();

    facilities.forEach((f) => {
      L.circleMarker([f.latitude, f.longitude], {
        radius: 6, color: "#08393e", weight: 2, fillColor: "#0e5b61", fillOpacity: 0.9,
      }).bindPopup(`<b>${f.name}</b><br>${f.type.replace("_", " ")}<br>${f.village}`).addTo(layers.facilities);
    });

    clusters.forEach((c) => {
      L.circle([c.centroid_lat, c.centroid_lng], {
        radius: c.radius_km * 1000, color: "#e67e22", weight: 2, fillColor: "#e67e22", fillOpacity: 0.12,
      }).bindPopup(`<b>Possible cluster</b><br>${c.case_count} cases within ${c.radius_km} km`).addTo(layers.clusters);
    });

    reports.forEach((r) => {
      if (!r.risk_level) return;
      L.circleMarker([r.latitude, r.longitude], {
        radius: r.risk_level === "high" ? 7 : 5,
        color: "#fff", weight: 1.5,
        fillColor: COLORS[r.risk_level], fillOpacity: 0.95,
      }).bindPopup(
        `<b>${r.risk_level.toUpperCase()} risk</b><br>${r.symptoms.join(", ").replace(/_/g, " ")}<br>` +
        `<span style="color:#888">${r.village || ""} · ${timeAgo(r.created_at)}</span>`
      ).addTo(layers.reports);
    });
  }

  function renderClusters(clusters) {
    const el = $("clusterList");
    if (!clusters.length) { el.innerHTML = '<p class="subtle">None detected.</p>'; return; }
    el.innerHTML = clusters
      .map(
        (c) => `<div class="item"><span class="dot medium"></span>
          <div><b>${c.case_count} cases</b> within ${c.radius_km} km
          <div class="meta">centroid ${c.centroid_lat.toFixed(3)}, ${c.centroid_lng.toFixed(3)}</div></div></div>`
      )
      .join("");
  }

  function renderReferrals(refs) {
    const el = $("referralList");
    if (!refs.length) { el.innerHTML = '<p class="subtle">No referrals yet.</p>'; return; }
    el.innerHTML = refs
      .slice(0, 15)
      .map(
        (r) => `<div class="item"><span class="dot high"></span>
          <div><b>${r.facility_name || "Facility"}</b> · ${r.distance_km} km
          <div class="meta">${r.status} · ${r.channel.toUpperCase()} · ${timeAgo(r.created_at)}</div></div></div>`
      )
      .join("");
  }

  function renderReports(reports) {
    const el = $("reportList");
    if (!reports.length) { el.innerHTML = '<p class="subtle">No reports yet.</p>'; return; }
    el.innerHTML = reports
      .slice(0, 40)
      .map(
        (r) => `<div class="item"><span class="dot ${r.risk_level || "low"}"></span>
          <div><b>${(r.risk_level || "—").toUpperCase()}</b> — ${r.symptoms.join(", ").replace(/_/g, " ")}
          <div class="meta">${r.village || "unknown area"} · ${timeAgo(r.created_at)}</div></div></div>`
      )
      .join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMap();
    refresh();
    setInterval(refresh, 5000);
  });
})();