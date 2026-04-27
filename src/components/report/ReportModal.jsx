import { useState, useEffect, useRef } from 'react';
import { analyzeDensity, analyzeMammogram, analyzeUltrasound, predictTabular } from '../../services/apiService';
import { saveRadiologistReport } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';

// ── Step definitions — conditional on available image types ──────────────────
function buildSteps(hasMammo, hasUs) {
  const steps = [
    { id: 'validate', label: 'Validating images', icon: '🔍', detail: 'Checking image quality…' },
  ];
  if (hasMammo) {
    steps.push(
      { id: 'mammo',   label: 'Analysing mammogram finding', icon: '🩻', detail: 'Running EfficientNet-B0 classification…' },
      { id: 'density', label: 'Analysing breast density',    icon: '📐', detail: 'Running Siamese EfficientNetV2-S model…' },
    );
  }
  if (hasUs) {
    steps.push({ id: 'ultrasound', label: 'Analysing ultrasound', icon: '🔊', detail: 'Running ultrasound classification…' });
  }
  steps.push(
    { id: 'risk',   label: 'Calculating clinical risk', icon: '📊', detail: 'Running Random Forest + SHAP analysis…' },
    { id: 'saving', label: 'Saving report',             icon: '💾', detail: 'Writing to patient records…' },
    { id: 'done',   label: 'Report complete',           icon: '✅', detail: 'Report saved successfully.' },
  );
  return steps;
}

const S = { pending: 'pending', active: 'active', done: 'done', error: 'error' };

export default function ReportModal({
  patient, ccFile, mloFile, usFile,
  ccImageUrl, mloImageUrl, usImageUrl,
  scanLabel, onClose, onSaved,
}) {
  const { user } = useAuth();
  const hasMammo = !!(ccFile && mloFile);
  const hasUs    = !!usFile;
  const STEPS    = buildSteps(hasMammo, hasUs);

  const initialStates = Object.fromEntries(STEPS.map(s => [s.id, S.pending]));
  const [stepStates, setStepStates] = useState(initialStates);
  const [currentStep, setCurrentStep] = useState(0);
  const [error,  setError]  = useState('');
  const [report, setReport] = useState(null);
  const [phase,  setPhase]  = useState('processing');

  // Guard against React StrictMode double-invocation of useEffect
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setStep = (id, state) => setStepStates(prev => ({ ...prev, [id]: state }));

  const run = async () => {
    try {
      // ── Step 0: Validate ──────────────────────────────────────────────────
      setCurrentStep(0);
      setStep('validate', S.active);
      await delay(700);
      setStep('validate', S.done);

      let stepIdx = 1;
      let mammoResult = null;
      let densityResult = null;

      // ── Mammogram steps (only if CC + MLO uploaded) ───────────────────────
      if (hasMammo) {
        // Step: Mammogram finding (CC only)
        setCurrentStep(stepIdx);
        setStep('mammo', S.active);
        mammoResult = await analyzeMammogram(ccFile);
        setStep('mammo', S.done);
        stepIdx++;

        // Step: Density analysis (CC + MLO)
        setCurrentStep(stepIdx);
        setStep('density', S.active);
        densityResult = await analyzeDensity(ccFile, mloFile);
        setStep('density', S.done);
        stepIdx++;
      }

      // ── Ultrasound analysis (if ultrasound uploaded) ──────────────────────
      let usResult = null;
      if (hasUs) {
        setCurrentStep(stepIdx);
        setStep('ultrasound', S.active);
        usResult = await analyzeUltrasound(usFile);
        setStep('ultrasound', S.done);
        stepIdx++;
      }

      // ── Risk prediction ───────────────────────────────────────────────────
      setCurrentStep(stepIdx);
      setStep('risk', S.active);
      const riskResult = await predictTabular(patient);
      setStep('risk', S.done);
      stepIdx++;

      // ── Save report ───────────────────────────────────────────────────────
      setCurrentStep(stepIdx);
      setStep('saving', S.active);
      const reportType = hasMammo && hasUs ? 'combined_multimodal'
                       : hasMammo          ? 'combined'
                       :                    'ultrasound_only';
      const reportId = await saveRadiologistReport({
        patientId:            patient.id,
        patientName:          patient.name,
        radiologistId:        user.uid,
        reportType,
        // mammogram finding (null if ultrasound-only)
        mammoPrediction:      mammoResult?.prediction      ?? null,
        mammoPredictionIndex: mammoResult?.prediction_index ?? null,
        mammoConfidence:      mammoResult?.confidence      ?? null,
        mammoProbabilities:   mammoResult?.probabilities   ?? null,
        mammoFindingCategory: mammoResult?.finding_category ?? null,
        // density (null if ultrasound-only)
        densityClass:         densityResult?.density_class  ?? null,
        densityLabel:         densityResult?.density_label  ?? null,
        densityIndex:         densityResult?.density_index  ?? null,
        densityConfidence:    densityResult?.confidence     ?? null,
        // ultrasound (if present)
        usPrediction:         usResult?.prediction          ?? null,
        usPredictionIndex:    usResult?.prediction_index    ?? null,
        usConfidence:         usResult?.confidence          ?? null,
        usProbabilities:      usResult?.probabilities       ?? null,
        // risk
        riskLabel:            riskResult.risk_label,
        riskPercentage:       riskResult.risk_percentage,
        riskPrediction:       riskResult.prediction,
        // images
        ccImageUrl:           ccImageUrl  ?? null,
        mloImageUrl:          mloImageUrl ?? null,
        ultrasoundUrl:        usImageUrl  ?? null,
        gradcamImage:         densityResult?.gradcam_image ?? null,
        scanLabel,
      });
      setStep('saving', S.done);

      // ── Done ──────────────────────────────────────────────────────────────
      stepIdx++;
      setCurrentStep(stepIdx);
      setStep('done', S.done);
      await delay(300);

      setReport({
        mammoPrediction:      mammoResult?.prediction       ?? null,
        mammoPredictionIndex: mammoResult?.prediction_index ?? null,
        mammoConfidence:      mammoResult?.confidence       ?? null,
        mammoProbs:           mammoResult?.probabilities    ?? null,
        mammoFinding:         mammoResult?.finding_category ?? null,
        densityClass:         densityResult?.density_class  ?? null,
        densityLabel:         densityResult?.density_label  ?? null,
        densityIndex:         densityResult?.density_index  ?? null,
        densityConfidence:    densityResult?.confidence     ?? null,
        densityProbs:         densityResult?.probabilities  ?? null,
        gradcamImage:         densityResult?.gradcam_image  ?? null,
        usPrediction:         usResult?.prediction          ?? null,
        usConfidence:         usResult?.confidence          ?? null,
        usProbs:              usResult?.probabilities       ?? null,
        riskLabel:            riskResult.risk_label,
        riskPercentage:       riskResult.risk_percentage,
        riskPrediction:       riskResult.prediction,
        shapValues:           riskResult.shap_values,
        reportId,
        // uploaded image URLs for verification
        ccImageUrl:           ccImageUrl  ?? null,
        mloImageUrl:          mloImageUrl ?? null,
        usImageUrl:           usImageUrl  ?? null,
      });
      setPhase('result');
      if (onSaved) onSaved(reportId);

    } catch (err) {
      const failedStep = STEPS[currentStep]?.id;
      if (failedStep) setStep(failedStep, S.error);
      setError(err.message || 'An unexpected error occurred');
      setPhase('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={phase !== 'processing' ? onClose : undefined}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {phase === 'processing' && <ProcessingView stepStates={stepStates} currentStep={currentStep} steps={STEPS} />}
        {phase === 'result'     && <ResultView report={report} patient={patient} scanLabel={scanLabel} onClose={onClose} />}
        {phase === 'error'      && <ErrorView error={error} onClose={onClose} />}
      </div>
    </div>
  );
}

// ── Processing view ────────────────────────────────────────────────────────────

function ProcessingView({ stepStates, currentStep, steps }) {
  const activeStep = steps[currentStep];
  return (
    <div>
      <div className="relative bg-gradient-to-br from-rose-500 to-violet-600 px-6 pt-8 pb-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-32 h-32 rounded-full border-2 border-white/15 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        </div>
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-sm" />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">{activeStep?.icon ?? '🔬'}</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-1">Generating Report…</h2>
          <p className="text-white/70 text-sm">{activeStep?.detail ?? 'Processing…'}</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        {steps.map((step) => {
          const state = stepStates[step.id];
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                state === S.done   ? 'bg-emerald-500' :
                state === S.active ? 'bg-rose-500 animate-pulse' :
                state === S.error  ? 'bg-red-500' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {state === S.done  && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                {state === S.active && <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {state === S.error  && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                {state === S.pending && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />}
              </div>
              <span className={`text-sm font-medium transition-colors ${
                state === S.done   ? 'text-emerald-600 dark:text-emerald-400' :
                state === S.active ? 'text-gray-900 dark:text-white font-semibold' :
                state === S.error  ? 'text-red-500' :
                'text-gray-400 dark:text-gray-600'
              }`}>
                {step.label}
              </span>
              {state === S.active && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-6 pb-5">
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">Please wait — do not close this window</p>
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

const DENSITY_COLORS = ['emerald', 'blue', 'amber', 'red'];

const MAMMO_CONFIG = {
  Normal:     { color: 'emerald', icon: '✅', label: 'Normal',     desc: 'No suspicious findings detected. Routine screening recommended.' },
  Benign:     { color: 'amber',   icon: '⚠️', label: 'Benign',     desc: 'Benign finding detected. Short-interval follow-up recommended.' },
  Suspicious: { color: 'red',     icon: '🚨', label: 'Suspicious', desc: 'Suspicious finding — biopsy and oncology referral required.' },
};

const COLOR_CLASSES = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400', bar: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300', bar: 'bg-gray-400',
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
};

function ResultView({ report, patient, scanLabel, onClose }) {
  const [showProbs, setShowProbs] = useState(false);
  const [expandedImg, setExpandedImg] = useState(null); // lightbox

  const isUsOnly    = !report.mammoPrediction && !report.densityClass && !!report.usPrediction;
  const hasMammo    = !!report.mammoPrediction;
  const hasDensity  = !!report.densityClass;
  const hasUs       = !!report.usPrediction;

  const di          = report.densityIndex ?? 0;
  const densColor   = COLOR_CLASSES[DENSITY_COLORS[di] ?? 'gray'];
  const mammoConf   = MAMMO_CONFIG[report.mammoPrediction] ?? MAMMO_CONFIG.Normal;
  const mammoColor  = COLOR_CLASSES[mammoConf?.color ?? 'gray'];
  const isHighRisk  = report.riskPrediction === 1;
  const riskColor   = isHighRisk ? COLOR_CLASSES.red : COLOR_CLASSES.emerald;

  // Build uploaded scans list
  const uploadedScans = [
    report.ccImageUrl  && { url: report.ccImageUrl,  label: 'Mammogram (CC)',  icon: '🩻' },
    report.mloImageUrl && { url: report.mloImageUrl, label: 'Mammogram (MLO)', icon: '🔄' },
    report.usImageUrl  && { url: report.usImageUrl,  label: 'Ultrasound',      icon: '🔊' },
  ].filter(Boolean);

  return (
    <div className="max-h-[90vh] overflow-y-auto">
      {/* Lightbox */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <button
            onClick={() => setExpandedImg(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-lg transition-all"
          >✕</button>
          <div className="text-center" onClick={e => e.stopPropagation()}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">{expandedImg.label}</p>
            <img
              src={expandedImg.url}
              alt={expandedImg.label}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-violet-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wide">Report Saved</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">{patient.name}</h2>
          <p className="text-white/70 text-xs mt-0.5">{scanLabel}</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all text-sm">
          ✕
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* ── 0. Uploaded Scans — verify images ────────────────────────────── */}
        {uploadedScans.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Uploaded Scans — Verify Images
              </span>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                Click to enlarge
              </span>
            </div>

            {/* Image grid */}
            <div className={`grid gap-0 ${uploadedScans.length === 1 ? 'grid-cols-1' : uploadedScans.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {uploadedScans.map((scan, idx) => (
                <button
                  key={idx}
                  onClick={() => setExpandedImg(scan)}
                  className={`relative group overflow-hidden bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    uploadedScans.length > 1 && idx < uploadedScans.length - 1
                      ? 'border-r border-gray-700'
                      : ''
                  }`}
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <img
                    src={scan.url}
                    alt={scan.label}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                  {/* Label badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                    <p className="text-white text-xs font-semibold truncate">
                      {scan.icon} {scan.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Confirmation note */}
            <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/40 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                Please verify these are the correct patient scans before confirming the report.
              </p>
            </div>
          </div>
        )}
        {/* ── 1. Mammogram Finding — only for mammogram reports ────────────── */}
        {hasMammo && (
          <div className={`rounded-2xl border p-4 ${mammoColor.bg} ${mammoColor.border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Mammogram Finding
              </span>
              {report.mammoFinding && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${mammoColor.badge}`}>
                  {report.mammoFinding}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{mammoConf.icon}</span>
              <div>
                <p className={`text-2xl font-black ${mammoColor.text}`}>{report.mammoPrediction}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mammoConf.desc}</p>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 dark:text-gray-500">Confidence</span>
                <span className={`font-bold ${mammoColor.text}`}>{report.mammoConfidence?.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${mammoColor.bar}`}
                  style={{ width: `${report.mammoConfidence ?? 0}%` }} />
              </div>
            </div>
            {report.mammoProbs && (
              <div>
                <button
                  onClick={() => setShowProbs(p => !p)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <svg className={`w-3 h-3 transition-transform ${showProbs ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showProbs ? 'Hide' : 'Show'} class probabilities
                </button>
                {showProbs && (
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(report.mammoProbs).map(([cls, pct]) => {
                      const cfg = MAMMO_CONFIG[cls] ?? MAMMO_CONFIG.Normal;
                      const cc  = COLOR_CLASSES[cfg.color];
                      return (
                        <div key={cls}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{cls}</span>
                            <span className={`font-bold ${cc.text}`}>{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cc.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 2. Breast Density — only for mammogram reports ───────────────── */}
        {hasDensity && (
          <div className={`rounded-2xl border p-4 ${densColor.bg} ${densColor.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Breast Density</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${densColor.badge}`}>
                BI-RADS {['A','B','C','D'][di]}
              </span>
            </div>
            <p className={`text-xl font-black ${densColor.text}`}>{report.densityClass}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{report.densityLabel}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 dark:text-gray-500">Confidence</span>
                <span className={`font-bold ${densColor.text}`}>{report.densityConfidence?.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${densColor.bar}`}
                  style={{ width: `${report.densityConfidence ?? 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── 2b. Ultrasound Finding — HERO for ultrasound-only reports ─────── */}
        {hasUs && (() => {
          const US_CFG = {
            Malignant: { color: 'text-red-600 dark:text-red-400',     badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',         bar: 'bg-red-500',     icon: '🚨', bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800' },
            Benign:    { color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', bar: 'bg-amber-500', icon: '⚠️', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
            Normal:    { color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500', icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
          };
          const uc = US_CFG[report.usPrediction] ?? US_CFG.Normal;
          return (
            <div className={`rounded-2xl border p-4 ${uc.bg} ${uc.border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ultrasound Finding</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${uc.badge}`}>{report.usPrediction}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{uc.icon}</span>
                <div>
                  <p className={`text-xl font-black ${uc.color}`}>{report.usPrediction}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{report.usConfidence?.toFixed(1)}% confidence</p>
                </div>
              </div>
              {report.usProbs && (
                <div className="space-y-1.5">
                  {Object.entries(report.usProbs).map(([cls, pct]) => {
                    const cc = US_CFG[cls] ?? US_CFG.Normal;
                    return (
                      <div key={cls}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{cls}</span>
                          <span className={`font-bold ${cc.color}`}>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cc.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 3. Clinical Risk Strip ───────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${riskColor.bg} ${riskColor.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                Clinical Risk · RF Model
              </span>
              <p className={`text-2xl font-black ${riskColor.text}`}>
                {report.riskPercentage?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">from clinical data</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${riskColor.badge}`}>
              {report.riskLabel}
            </span>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${riskColor.bar}`}
                style={{ width: `${report.riskPercentage ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* ── 4. Clinical alert ────────────────────────────────────────────── */}
        {(report.mammoPrediction === 'Suspicious' || (hasDensity && di >= 2) || isHighRisk || report.usPrediction === 'Malignant') && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
              {report.mammoPrediction === 'Suspicious' && 'Suspicious mammogram finding — biopsy and urgent oncology referral required. '}
              {report.mammoPrediction === 'Benign' && 'Benign finding — short-interval follow-up mammogram in 6 months. '}
              {report.usPrediction === 'Malignant' && 'Malignant ultrasound finding — immediate biopsy required. '}
              {hasDensity && di >= 3 && 'Extremely dense tissue — supplemental MRI recommended. '}
              {hasDensity && di === 2 && 'Heterogeneous density — consider supplemental ultrasound. '}
              {isHighRisk && 'High clinical risk score — oncology referral advised.'}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Report saved · ID: {report.reportId?.slice(-8)}
        </p>

        <button onClick={onClose} className="btn-primary w-full py-3">Done</button>
      </div>
    </div>
  );
}

// ── Error view ─────────────────────────────────────────────────────────────────

function ErrorView({ error, onClose }) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Report Generation Failed</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 leading-relaxed">{error}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 mb-5">
        Make sure the HuggingFace backend is running and both CC + MLO images are valid mammograms.
      </p>
      <button onClick={onClose} className="btn-secondary w-full py-3">Close</button>
    </div>
  );
}

const delay = ms => new Promise(r => setTimeout(r, ms));
