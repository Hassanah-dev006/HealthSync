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
}());