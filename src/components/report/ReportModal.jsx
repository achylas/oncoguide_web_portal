import { useState, useEffect } from 'react';
import { analyzeDensity, predictTabular } from '../../services/apiService';
import { saveRadiologistReport } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';

// ── Step definitions ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 'validate',  label: 'Validating images',        icon: '🔍', detail: 'Checking CC and MLO image quality…' },
  { id: 'density',   label: 'Analysing breast density',  icon: '🩻', detail: 'Running Siamese EfficientNetV2-S model…' },
  { id: 'risk',      label: 'Calculating risk score',    icon: '📊', detail: 'Running Random Forest + SHAP analysis…' },
  { id: 'saving',    label: 'Saving report',             icon: '💾', detail: 'Writing to patient records…' },
  { id: 'done',      label: 'Report complete',           icon: '✅', detail: 'Report saved successfully.' },
];

const S = { pending: 'pending', active: 'active', done: 'done', error: 'error' };

/**
 * ReportModal
 *
 * Props:
 *   patient      — full patient object
 *   ccFile       — CC mammogram File
 *   mloFile      — MLO mammogram File
 *   ccImageUrl   — already-uploaded Supabase URL for CC
 *   mloImageUrl  — already-uploaded Supabase URL for MLO
 *   scanLabel    — label string
 *   onClose      — called when modal is dismissed
 *   onSaved      — called with reportId when saved
 */
export default function ReportModal({ patient, ccFile, mloFile, ccImageUrl, mloImageUrl, scanLabel, onClose, onSaved }) {
  const { user } = useAuth();

  const [stepStates, setStepStates] = useState({
    validate: S.pending,
    density:  S.pending,
    risk:     S.pending,
    saving:   S.pending,
    done:     S.pending,
  });
  const [currentStep, setCurrentStep] = useState(0); // index into STEPS
  const [error,       setError]       = useState('');
  const [report,      setReport]      = useState(null); // final report data
  const [phase,       setPhase]       = useState('processing'); // 'processing' | 'result' | 'error'

  // ── Run pipeline on mount ──────────────────────────────────────────────────

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStep = (id, state) =>
    setStepStates(prev => ({ ...prev, [id]: state }));

  const run = async () => {
    try {
      // ── Step 0: Validate (images already validated before upload, just show) ──
      setCurrentStep(0);
      setStep('validate', S.active);
      await delay(800); // brief pause to show the step
      setStep('validate', S.done);

      // ── Step 1: Density analysis ──────────────────────────────────────────
      setCurrentStep(1);
      setStep('density', S.active);
      const densityResult = await analyzeDensity(ccFile, mloFile);
      setStep('density', S.done);

      // ── Step 2: Risk prediction ───────────────────────────────────────────
      setCurrentStep(2);
      setStep('risk', S.active);
      const riskResult = await predictTabular(patient);
      setStep('risk', S.done);

      // ── Step 3: Save report ───────────────────────────────────────────────
      setCurrentStep(3);
      setStep('saving', S.active);
      const reportId = await saveRadiologistReport({
        patientId:         patient.id,
        patientName:       patient.name,
        radiologistId:     user.uid,
        reportType:        'combined',
        densityClass:      densityResult.density_class,
        densityLabel:      densityResult.density_label,
        densityIndex:      densityResult.density_index,
        densityConfidence: densityResult.confidence,
        riskLabel:         riskResult.risk_label,
        riskPercentage:    riskResult.risk_percentage,
        riskPrediction:    riskResult.prediction,
        ccImageUrl,
        mloImageUrl,
        gradcamImage:      densityResult.gradcam_image,
        scanLabel,
      });
      setStep('saving', S.done);

      // ── Step 4: Done ──────────────────────────────────────────────────────
      setCurrentStep(4);
      setStep('done', S.done);
      await delay(400);

      setReport({
        densityClass:      densityResult.density_class,
        densityLabel:      densityResult.density_label,
        densityIndex:      densityResult.density_index,
        densityConfidence: densityResult.confidence,
        densityProbs:      densityResult.probabilities,
        gradcamImage:      densityResult.gradcam_image,
        riskLabel:         riskResult.risk_label,
        riskPercentage:    riskResult.risk_percentage,
        riskPrediction:    riskResult.prediction,
        reportId,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={phase !== 'processing' ? onClose : undefined}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {phase === 'processing' && <ProcessingView stepStates={stepStates} currentStep={currentStep} />}
        {phase === 'result'     && <ResultView report={report} patient={patient} scanLabel={scanLabel} onClose={onClose} />}
        {phase === 'error'      && <ErrorView error={error} onClose={onClose} />}
      </div>
    </div>
  );
}

// ── Processing view ────────────────────────────────────────────────────────────

function ProcessingView({ stepStates, currentStep }) {
  const activeStep = STEPS[currentStep];

  return (
    <div>
      {/* Animated header */}
      <div className="relative bg-gradient-to-br from-rose-500 to-violet-600 px-6 pt-8 pb-6 overflow-hidden">
        {/* Scanning animation rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-32 h-32 rounded-full border-2 border-white/15 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        </div>
        {/* Corner brackets like the reference image */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-sm" />

        <div className="relative z-10 text-center">
          {/* Pulsing icon */}
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">{activeStep?.icon ?? '🔬'}</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-1">Generating Report…</h2>
          <p className="text-white/70 text-sm">{activeStep?.detail ?? 'Processing…'}</p>
        </div>
      </div>

      {/* Steps list */}
      <div className="px-6 py-5 space-y-3">
        {STEPS.map((step, i) => {
          const state = stepStates[step.id];
          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Status icon */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                state === S.done  ? 'bg-emerald-500' :
                state === S.active ? 'bg-rose-500 animate-pulse' :
                state === S.error  ? 'bg-red-500' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {state === S.done && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state === S.active && (
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {state === S.error && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {state === S.pending && (
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                )}
              </div>

              {/* Label */}
              <span className={`text-sm font-medium transition-colors ${
                state === S.done   ? 'text-emerald-600 dark:text-emerald-400' :
                state === S.active ? 'text-gray-900 dark:text-white font-semibold' :
                state === S.error  ? 'text-red-500' :
                'text-gray-400 dark:text-gray-600'
              }`}>
                {step.label}
              </span>

              {/* Active spinner on right */}
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
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Please wait — do not close this window
        </p>
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

const DENSITY_COLORS = ['emerald', 'blue', 'amber', 'red'];
const DENSITY_LABELS_SHORT = ['A — Fatty', 'B — Scattered', 'C — Heterogeneous', 'D — Extremely Dense'];

function ResultView({ report, patient, scanLabel, onClose }) {
  const di = report.densityIndex ?? 0;
  const dc = DENSITY_COLORS[di] ?? 'gray';
  const isHighRisk = report.riskPrediction === 1;

  const colorMap = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-400',  border: 'border-amber-200 dark:border-amber-800',  badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-700 dark:text-red-400',      border: 'border-red-200 dark:border-red-800',      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
    gray:    { bg: 'bg-gray-50 dark:bg-gray-800',       text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-700',    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  };
  const c = colorMap[dc];

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-violet-600 px-6 py-5 flex items-center justify-between">
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
        {/* Density result */}
        <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Breast Density</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
              BI-RADS {['A','B','C','D'][di]}
            </span>
          </div>
          <p className={`text-xl font-black ${c.text}`}>{report.densityClass}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{DENSITY_LABELS_SHORT[di]}</p>

          {/* Confidence bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 dark:text-gray-500">Confidence</span>
              <span className={`font-bold ${c.text}`}>{report.densityConfidence?.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                di === 0 ? 'bg-emerald-500' : di === 1 ? 'bg-blue-500' : di === 2 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${report.densityConfidence ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* Risk score */}
        <div className={`rounded-2xl border p-4 ${
          isHighRisk
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Clinical Risk Score</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isHighRisk
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
            }`}>
              {report.riskLabel}
            </span>
          </div>
          <p className={`text-3xl font-black ${isHighRisk ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {report.riskPercentage?.toFixed(1)}%
          </p>
          <div className="mt-3">
            <div className="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${report.riskPercentage ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* Clinical note */}
        {(di >= 2 || isHighRisk) && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
              {di >= 3 && 'Extremely dense tissue — supplemental MRI recommended. '}
              {di === 2 && 'Heterogeneous density — consider supplemental ultrasound. '}
              {isHighRisk && 'High clinical risk score — oncology referral advised.'}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Report saved · ID: {report.reportId?.slice(-8)}
        </p>

        <button onClick={onClose} className="btn-primary w-full py-3">
          Done
        </button>
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

// ── Utility ────────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
