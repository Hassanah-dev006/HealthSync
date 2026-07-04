/* Reporter app logic: symptom selection, language switching, location, submit. */
(function () {
  const CORE = ["fever", "chills", "headache", "sweating", "muscle_pain", "fatigue", "nausea", "vomiting", "diarrhea"];
  const DANGER = ["convulsions", "difficulty_breathing", "unable_to_drink", "repeated_vomiting", "unconscious"];
  const KIGALI = [-1.9441, 30.0619];

  let lang = "en";
  let selected = new Set();
  let durationDays = 1;
  let location = null; // {lat, lng}
  let map, marker;

  const t = (k) => (window.I18N[lang][k] ?? window.I18N.en[k] ?? k);
  const $ = (id) => document.getElementById(id);

  // ---------- render symptom tiles ----------
  function renderSymptoms() {
    const make = (key) => {
      const s = window.SYMPTOM_LABELS[key];
      const isDanger = DANGER.includes(key);
      const el = document.createElement("div");
      el.className = "symptom" + (isDanger ? " danger" : "") + (selected.has(key) ? " selected" : "");
      el.dataset.key = key;
      el.innerHTML = `<span class="emoji">${s.emoji}</span><span class="label">${s[lang]}</span>`;
      el.addEventListener("click", () => {
        if (selected.has(key)) selected.delete(key);
        else selected.add(key);
        el.classList.toggle("selected");
      });
      return el;
    };
    const core = $("coreSymptoms"); core.innerHTML = "";
    CORE.forEach((k) => core.appendChild(make(k)));
    const danger = $("dangerSymptoms"); danger.innerHTML = "";
    DANGER.forEach((k) => danger.appendChild(make(k)));
  }

  // ---------- duration pills ----------
  function renderDuration() {
    const wrap = $("durationPills"); wrap.innerHTML = "";
    const opts = [
      { v: 1, label: `1 ${t("day")}` },
      { v: 2, label: `2 ${t("days")}` },
      { v: 3, label: `3 ${t("days")}` },
      { v: 4, label: `4 ${t("days")}` },
      { v: 5, label: t("moreDays") },
    ];
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = o.label;
      if (o.v === durationDays) b.classList.add("active");
      b.addEventListener("click", () => {
        durationDays = o.v;
        renderDuration();
      });
      wrap.appendChild(b);
    });
  }
  // ---------- static text ----------
  function applyText() {
    const ids = [
      "tagline", "reportTitle", "reportIntro", "dangerNote", "durationLabel",
      "locationLabel", "useLocation", "optionalDetails", "disclaimer", "whyTitle",
      "referralTitle",
    ];
    ids.forEach((id) => { if ($(id)) $(id).textContent = t(id); });
    $("appName").childNodes[0].nodeValue = t("appName");
    $("coreLabel").textContent = t("coreSymptoms");
    $("dangerLabel").textContent = t("dangerSymptoms");
    $("submitLabel").textContent = t("submit");
    $("name").placeholder = t("namePlaceholder");
    $("phone").placeholder = t("phonePlaceholder");
    $("againBtn").textContent = t("newReport");
    $("homeBtn").textContent = t("backHome");
  }

  // ---------- map for location ----------
  function initMap() {
    map = L.map("map").setView(KIGALI, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    map.on("click", (e) => setLocation(e.latlng.lat, e.latlng.lng, t("locationManual")));
  }
  function setLocation(lat, lng, statusText) {
    location = { lat, lng };
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 15);
    $("locStatus").textContent = statusText || t("locationSet");
  }
  // ---------- submit ----------
  async function submit() {
    if (selected.size === 0) { alert(t("selectSymptom")); return; }
    if (!location) { alert(t("needLocation")); return; }

    const btn = $("submitBtn");
    btn.disabled = true;
    $("submitLabel").textContent = t("submitting");
    try {
      const result = await window.api.post("/api/reports", {
        symptoms: [...selected],
        durationDays,
        latitude: location.lat,
        longitude: location.lng,
        name: $("name").value.trim() || null,
        phone: $("phone").value.trim() || null,
        language: lang,
      });
      showResult(result);
    } catch (err) {
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      btn.disabled = false;
      $("submitLabel").textContent = t("submit");
    }
  }

  // ---------- result ----------
  function showResult(result) {
    const level = result.assessment.level;
    $("formView").classList.add("hidden");
    $("resultView").classList.remove("hidden");
    window.scrollTo(0, 0);

    const badge = $("riskBadge");
    badge.className = "risk-badge risk-" + level;
    badge.textContent = t("result" + level.charAt(0).toUpperCase() + level.slice(1));
    $("advice").textContent = t("advice" + level.charAt(0).toUpperCase() + level.slice(1));

    const reasons = $("reasonsList"); reasons.innerHTML = "";
    result.assessment.reasons.forEach((r) => {
      const li = document.createElement("li"); li.textContent = r; reasons.appendChild(li);
    });

    const box = $("referralBox");
    if (result.referral) {
      box.classList.remove("hidden");
      $("referralText").textContent = t("referralText");
      $("referralMsg").textContent = result.referral.message;
    } else {
      box.classList.add("hidden");
    }
  }

  function reset() {
    selected = new Set(); durationDays = 1;
    $("name").value = ""; $("phone").value = "";
    renderSymptoms(); renderDuration();
    $("resultView").classList.add("hidden");
    $("formView").classList.remove("hidden");
    window.scrollTo(0, 0);
    setTimeout(() => map.invalidateSize(), 50);
  }
  // ---------- wire up ----------
  function init() {
    renderSymptoms(); renderDuration(); applyText(); initMap();

    $("langSwitch").querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        lang = b.dataset.lang;
        $("langSwitch").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
        document.documentElement.lang = lang;
        renderSymptoms(); renderDuration(); applyText();
      });
    });

    $("locBtn").addEventListener("click", () => {
      $("locStatus").textContent = t("locating");
      if (!navigator.geolocation) { $("locStatus").textContent = t("locationError"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(pos.coords.latitude, pos.coords.longitude, t("locationSet")),
        () => { $("locStatus").textContent = t("locationError"); }
      );
    });

    $("submitBtn").addEventListener("click", submit);
    $("againBtn").addEventListener("click", reset);
    setTimeout(() => map.invalidateSize(), 200);
  }

  document.addEventListener("DOMContentLoaded", init);
}());