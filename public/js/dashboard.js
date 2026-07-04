/* Dashboard: live map of reports, outbreak clusters, facilities. */
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
}());