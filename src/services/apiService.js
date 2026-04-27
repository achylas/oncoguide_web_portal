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

// ── Mammogram finding analysis (single CC view) ────────────────────────────────

/**
 * @param {File} ccFile — CC view mammogram
 * @returns {{ prediction, prediction_index, confidence, probabilities, gradcam_image, finding_category }}
 *   prediction: "Normal" | "Benign" | "Suspicious"
 */
export async function analyzeMammogram(ccFile) {
  const body = new FormData();
  body.append('file', ccFile);

  const res = await fetch(`${BASE_URL}/analyze/mammogram`, { method: 'POST', body });
  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try { const j = await res.json(); detail = j.detail ?? detail; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

// ── Ultrasound analysis ────────────────────────────────────────────────────────

/**
 * @param {File} file — ultrasound image
 * @returns {{ prediction, prediction_index, confidence, probabilities, gradcam_image }}
 *   prediction: "Benign" | "Normal" | "Malignant"
 */
export async function analyzeUltrasound(file) {
  const body = new FormData();
  body.append('file', file);

  const res = await fetch(`${BASE_URL}/analyze/ultrasound`, { method: 'POST', body });
  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try { const j = await res.json(); detail = j.detail ?? detail; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

// ── Tabular risk prediction ────────────────────────────────────────────────────

/**
 * @param {object} patientData — patient clinical fields (supports both flat and nested web portal schema)
 * @returns {{ prediction, probability, risk_label, risk_percentage, shap_values, base_value }}
 */
export async function predictTabular(patientData) {
  const repro    = patientData.reproductive    ?? {};
  const clinical = patientData.clinicalAssessment ?? {};
  const lifestyle = patientData.lifestyle      ?? {};

  // ── family history: stored as nested object by web portal ──────────────
  const famRaw    = patientData.familyHistory ?? {};
  const famIsObj  = typeof famRaw === 'object' && famRaw !== null && !Array.isArray(famRaw);
  const famHistory = famIsObj ? (Number(famRaw.hasHistory) || 0) : (Number(patientData.family_history) || 0);
  const famCount   = famIsObj ? (Number(famRaw.count)      || 0) : (Number(patientData.family_history_count) || 0);
  const famDegree  = famIsObj ? (Number(famRaw.degree)     || 0) : (Number(patientData.family_history_degree) || 0);

  // ── breastfeeding: web portal stores months, model needs binary ─────────
  const bfMonths = Number(repro.breastfeedingMonths) || 0;
  const bfBinary = bfMonths > 0 ? 1 : (Number(repro.breastfeeding ?? patientData.breastfeeding) || 0);

  // ── exercise: web portal stores in lifestyle.exerciseRegular ───────────
  const exercise = Number(lifestyle.exerciseRegular ?? patientData.exerciseRegular ?? patientData.exercise_regular) || 0;

  const payload = {
    age:                    Number(patientData.age)                                                    || 0,
    menarche:               Number(repro.menarcheAge      ?? repro.menarche      ?? patientData.menarche) || 13,
    menopause:              Number(repro.menopauseAge     ?? repro.menopause     ?? patientData.menopause) || 0,
    agefirst:               Number(repro.firstChildAge    ?? repro.ageFirstPregnancy ?? patientData.agefirst) || 0,
    children:               Number(repro.numberOfChildren ?? patientData.children)                     || 0,
    breastfeeding:          bfBinary,
    imc:                    Number(clinical.imc ?? patientData.imc)                                    || 25,
    weight:                 Number(patientData.weight)                                                 || 60,
    menopause_status:       repro.menopauseStatus != null ? Number(repro.menopauseStatus) : (repro.menopauseAge ? 1 : 0),
    pregnancy:              Number(repro.pregnancy ?? patientData.pregnancy)                           || 0,
    family_history:         famHistory,
    family_history_count:   famCount,
    family_history_degree:  famDegree,
    exercise_regular:       exercise,
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
