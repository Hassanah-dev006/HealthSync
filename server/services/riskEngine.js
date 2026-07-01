const SYMPTOMS = {
  fever:               { weight: 3, danger: false, malariaKey: true },
  chills:              { weight: 3, danger: false, malariaKey: true },
  headache:            { weight: 2, danger: false, malariaKey: true },
  sweating:            { weight: 2, danger: false },
  muscle_pain:         { weight: 1, danger: false },
  fatigue:             { weight: 1, danger: false },
  nausea:              { weight: 1, danger: false },
  vomiting:            { weight: 2, danger: false },
  diarrhea:            { weight: 1, danger: false },
  // --- danger signs ---
  convulsions:         { weight: 6, danger: true },
  difficulty_breathing:{ weight: 6, danger: true },
  unable_to_drink:     { weight: 5, danger: true },
  repeated_vomiting:   { weight: 5, danger: true },
  unconscious:         { weight: 8, danger: true },
};

/**
 * @param {string[]} symptoms  list of symptom keys
 * @param {number} durationDays how many days symptoms have lasted
 * @returns {{level:string, score:number, reasons:string[]}}
 */
function assess(symptoms = [], durationDays = 1) {
  const valid = symptoms.filter((s) => SYMPTOMS[s]);
  const reasons = [];
  let score = 0;

  // 1. Base score from symptom weights
  for (const s of valid) score += SYMPTOMS[s].weight;

  // 2. Danger signs -> immediate HIGH
  const dangerSigns = valid.filter((s) => SYMPTOMS[s].danger);
  if (dangerSigns.length > 0) {
    reasons.push("Danger sign present (" + dangerSigns.join(", ").replace(/_/g, " ") + ")");
    return { level: "high", score: Math.max(score, 10), reasons };
  }

  // 3. Classic malaria triad: fever + chills + headache -> HIGH
  const hasFever = valid.includes("fever");
  const hasChills = valid.includes("chills");
  const hasHeadache = valid.includes("headache");
  if (hasFever && hasChills && hasHeadache) {
    reasons.push("Classic malaria pattern: fever + chills + headache");
    score += 2;
    return { level: "high", score, reasons };
  }

  // 4. Duration adds risk (longer untreated fever is more dangerous)
  if (hasFever && durationDays >= 3) {
    score += 3;
    reasons.push("Fever lasting " + durationDays + " days");
  } else if (hasFever && durationDays >= 2) {
    score += 1;
    reasons.push("Fever lasting " + durationDays + " days");
  }

  // 5. Fever combined with another core malaria symptom -> at least MEDIUM
  if (hasFever && (hasChills || hasHeadache)) {
    reasons.push("Fever with another malaria symptom");
  }

  // 6. Final banding by score
  let level;
  if (score >= 8) level = "high";
  else if (score >= 4) level = "medium";
  else level = "low";

  if (reasons.length === 0) {
    reasons.push(valid.length ? "Mild / non-specific symptoms" : "No malaria-related symptoms reported");
  }
  return { level, score, reasons };
}

module.exports = { assess, SYMPTOMS };