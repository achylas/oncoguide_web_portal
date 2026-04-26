/**
 * OncoGuide AI Backend — HuggingFace Spaces
 *
 * Endpoints:
 *   POST /validate/mammogram   → MobileNetV3 gatekeeper
 *   POST /validate/ultrasound  → EfficientNet-B0 gatekeeper
 *   POST /analyze/density      → Siamese EfficientNetV2-S (CC + MLO)
 *   POST /predict/tabular      → Random Forest + SHAP
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://Inshirah-oncoguide-api.hf.space';

// ── Image validation ───────────────────────────────────────────────────────────

export async function validateImage(file, imageType) {
  const endpoint = imageType === 'mammogram'
    ? `${BASE_URL}/validate/mammogram`
    : `${BASE_URL}/validate/ultrasound`;

  const body = new FormData();
  body.append('file', file);

  const res = await fetch(endpoint, { method: 'POST', body });
  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try { const j = await res.json(); detail = j.detail ?? detail; } catch { /* */ }
    throw new Error(detail);
  }
  const json = await res.json();
  return { isValid: json.is_valid, score: json.score, message: json.message };
}

// ── Density analysis (CC + MLO) ────────────────────────────────────────────────

/**
 * @param {File} ccFile   — CC view mammogram
 * @param {File} mloFile  — MLO view mammogram
 * @returns {{ densityClass, densityLabel, densityIndex, confidence, probabilities, gradcamImage }}
 */
export async function analyzeDensity(ccFile, mloFile) {
  const body = new FormData();
  body.append('cc_file',  ccFile);
  body.append('mlo_file', mloFile);

  const res = await fetch(`${BASE_URL}/analyze/density`, { method: 'POST', body });
  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try { const j = await res.json(); detail = j.detail ?? detail; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

// ── Tabular risk prediction ────────────────────────────────────────────────────

/**
 * @param {object} patientData — patient clinical fields
 * @returns {{ prediction, probability, risk_label, risk_percentage, shap_values, base_value }}
 */
export async function predictTabular(patientData) {
  // Map web patient schema → backend feature names
  const payload = {
    age:                    Number(patientData.age)                              || 0,
    menarche:               Number(patientData.reproductive?.menarcheAge)        || 13,
    menopause:              Number(patientData.reproductive?.menopauseAge)       || 0,
    agefirst:               Number(patientData.reproductive?.firstChildAge)      || 0,
    children:               Number(patientData.reproductive?.numberOfChildren)   || 0,
    breastfeeding:          Number(patientData.reproductive?.breastfeedingMonths) > 0 ? 1 : 0,
    imc:                    Number(patientData.clinicalAssessment?.imc)          || 25,
    weight:                 Number(patientData.weight)                           || 60,
    menopause_status:       patientData.reproductive?.menopauseAge ? 1 : 0,
    pregnancy:              Number(patientData.reproductive?.numberOfChildren) > 0 ? 1 : 0,
    family_history:         0,
    family_history_count:   0,
    family_history_degree:  0,
    exercise_regular:       0,
  };

  const res = await fetch(`${BASE_URL}/predict/tabular`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try { const j = await res.json(); detail = j.detail ?? detail; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

// ── Health check ───────────────────────────────────────────────────────────────

export async function isBackendReachable() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}
