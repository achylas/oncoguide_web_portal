import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPatient } from '../services/patientService';
import PageLayout from '../components/layout/PageLayout';

// ── Validation (mirrors RF model constraints) ─────────────────────────────────
function validateStep(step, form) {
  const errs = {};
  const n = (v) => v === '' ? NaN : Number(v);
  const ok = (v, min, max) => !isNaN(n(v)) && n(v) >= min && n(v) <= max;

  if (step === 0) {
    if (!form.name.trim())                          errs.name     = 'Full name is required.';
    if (form.age    !== '' && !ok(form.age,    0, 130)) errs.age    = 'Age must be 0–130.';
    if (form.weight !== '' && !ok(form.weight, 0, 300)) errs.weight = 'Weight must be 0–300 kg.';
    if (form.imc    !== '' && !ok(form.imc,    0, 100)) errs.imc    = 'BMI must be 0–100.';
    if (!form.isMarried)                            errs.isMarried = 'Please select marital status.';
  }

  if (step === 1) {
    if (form.menarcheAge !== '' && !ok(form.menarcheAge, 0, 30))
      errs.menarcheAge = 'Menarche age must be 0–30.';
    if (!form.menopauseStatus)
      errs.menopauseStatus = 'Please indicate menopause status.';
    if (form.menopauseStatus === 'yes') {
      if (!form.menopauseAge)
        errs.menopauseAge = 'Menopause age is required when menopause = Yes.';
      else if (!ok(form.menopauseAge, 0, 130))
        errs.menopauseAge = 'Menopause age must be 0–130.';
    }
    if (form.isMarried === 'yes') {
      if (!form.pregnancy)
        errs.pregnancy = 'Please indicate pregnancy history.';
      if (form.pregnancy === 'yes') {
        if (form.firstChildAge !== '' && !ok(form.firstChildAge, 0, 130))
          errs.firstChildAge = 'Age at first child must be 0–130.';
        if (form.numberOfChildren !== '' && !ok(form.numberOfChildren, 0, 20))
          errs.numberOfChildren = 'Children must be 0–20.';
      }
    }
  }

  if (step === 2) {
    if (form.exerciseRegular === '')
      errs.exerciseRegular = 'Please select exercise status.';
    if (!form.familyHistory)
      errs.familyHistory = 'Please indicate family history.';
    if (form.familyHistory === 'yes') {
      if (!form.familyHistoryCount)
        errs.familyHistoryCount = 'Please select how many relatives are affected.';
      const count = Number(form.familyHistoryCount) || 0;
      for (let i = 0; i < count; i++) {
        if (!form.familyRelations[i])
          errs[`familyRelation_${i}`] = `Please select relation for relative ${i + 1}.`;
      }
    }
  }

  return errs;
}

const STEPS = [
  { label: 'Basic Info',          desc: 'Patient identification',   icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { label: 'Reproductive Health', desc: 'Risk assessment factors',  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
  { label: 'Lifestyle & Family',  desc: 'Exercise, family history', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { label: 'Medical Info',        desc: 'History & medications',    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
];

const initialForm = {
  name: '', age: '', weight: '', imc: '',
  isMarried: '',
  menarcheAge: '', menopauseStatus: '', menopauseAge: '',
  pregnancy: '',
  firstChildAge: '', numberOfChildren: '', breastfeedingMonths: '',
  biopsies: '',
  exerciseDaysPerWeek: '',
  exerciseRegular: '',   // '0' | '1' — direct binary input
  familyHistory: '', familyHistoryCount: '', familyRelations: [],  // array of relation strings
  allergies: '', history: '', medications: '', comments: '',
};

export default function AddPatientPage() {
  const navigate = useNavigate();
  const [step,      setStep]      = useState(0);
  const [form,      setForm]      = useState(initialForm);
  const [fieldErrs, setFieldErrs] = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setFieldErrs(e => { const n = { ...e }; delete n[key]; return n; });
  };

  // ── Derived / zero-out values per model rules ─────────────────────────────
  const exerciseBinary    = form.exerciseRegular === '1' ? 1 : 0;
  const hasFamilyHistory  = form.familyHistory === 'yes' ? 1 : 0;
  const familyHistoryCount = hasFamilyHistory ? (Number(form.familyHistoryCount) || 0) : 0;
  // Degree: 1 if any 1st-degree relative, 2 if all 2nd-degree, 0 if none
  const firstDegree = ['mother', 'sister', 'daughter'];
  const familyDegree = hasFamilyHistory && form.familyRelations.length > 0
    ? (form.familyRelations.some(r => r && firstDegree.some(d => r.toLowerCase().includes(d))) ? 1 : 2)
    : 0;

  const menopauseStatus = form.menopauseStatus === 'yes' ? 1 : 0;
  const menopauseAge    = menopauseStatus === 1 ? (Number(form.menopauseAge) || 0) : 0;
  const isMarried       = form.isMarried === 'yes';
  const hasPregnancy    = isMarried && form.pregnancy === 'yes' ? 1 : 0;
  const firstChildAge   = hasPregnancy ? (Number(form.firstChildAge) || 0) : 0;
  const numChildren     = hasPregnancy ? (Number(form.numberOfChildren) || 0) : 0;
  const breastfeeding   = hasPregnancy ? (Number(form.breastfeedingMonths) > 0 ? 1 : 0) : 0;

  const tryNextStep = () => {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) { setFieldErrs(errs); return; }
    setFieldErrs({});
    setStep(s => s + 1);
  };

  const handleSave = async () => {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) { setFieldErrs(errs); return; }
    setSaving(true); setSaveError('');
    try {
      await addPatient({
        name:   form.name.trim(),
        age:    Number(form.age)    || null,
        weight: Number(form.weight) || null,
        reproductive: {
          menarcheAge: Number(form.menarcheAge) || null,
          menopauseStatus, menopauseAge,
          pregnancy: hasPregnancy, firstChildAge,
          numberOfChildren: numChildren,
          breastfeedingMonths: Number(form.breastfeedingMonths) || 0,
          isMarried,
        },
        lifestyle: {
          exerciseRegular: exerciseBinary,
        },
        familyHistory: {
          hasHistory: hasFamilyHistory,
          relations:  form.familyRelations,
          count:      familyHistoryCount,
          degree:     familyDegree,
        },
        // Flat RF model fields
        menarche:              Number(form.menarcheAge) || 0,
        menopause:             menopauseAge,
        menopause_status:      menopauseStatus,
        agefirst:              firstChildAge,
        children:              numChildren,
        breastfeeding,
        pregnancy:             hasPregnancy,
        imc:                   Number(form.imc) || 25,
        weight:                Number(form.weight) || 60,
        family_history:        hasFamilyHistory,
        family_history_count:  familyHistoryCount,
        family_history_degree: familyDegree,
        exercise_regular:      exerciseBinary,
        medical: {
          allergies:   form.allergies.trim(),
          history:     form.history.trim(),
          medications: form.medications.trim(),
          comments:    form.comments.trim(),
        },
        clinicalAssessment: {
          imc:      form.imc ? Number(form.imc) : null,
          biopsies: form.biopsies ? Number(form.biopsies) : 0,
        },
      });
      navigate('/patients');
    } catch (err) {
      setSaveError(err.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <button onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-5 transition-colors font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </button>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Patient</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Complete all {STEPS.length} steps to register the patient</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-4 space-y-1">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => i < step && setStep(i)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  i === step ? 'bg-gradient-to-r from-rose-50 to-violet-50 dark:from-rose-900/20 dark:to-violet-900/20 border border-rose-100 dark:border-rose-900/40'
                  : i < step ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {i < step ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : s.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${i === step ? 'text-rose-600 dark:text-rose-400' : i < step ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>{s.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-rose-500 to-violet-600 flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">{STEPS[step].icon}</div>
              <div>
                <h2 className="text-white font-bold text-lg">{STEPS[step].label}</h2>
                <p className="text-white/70 text-sm">{STEPS[step].desc}</p>
              </div>
              <div className="ml-auto text-white/60 text-sm font-medium">Step {step + 1} of {STEPS.length}</div>
            </div>

            <div className="p-6">
              {step === 0 && <Step1 form={form} set={set} errs={fieldErrs} />}
              {step === 1 && <Step2 form={form} set={set} errs={fieldErrs} />}
              {step === 2 && <Step3 form={form} set={set} errs={fieldErrs} />}
              {step === 3 && <Step4 form={form} set={set} />}

              {saveError && (
                <div className="mt-5 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {saveError}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
              {step > 0 && (
                <button onClick={() => { setFieldErrs({}); setStep(s => s - 1); }} className="btn-secondary flex-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button onClick={tryNextStep} className="btn-primary flex-1 shadow-glow-rose">
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 shadow-glow-rose">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save Patient</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function FieldErr({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1"><span>⚠</span>{msg}</p>;
}

function NumField({ label, hint, value, onChange, min, max, step = 1, required = false, err, suffix }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <input
          type="number" min={min} max={max} step={step}
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (v === '') { onChange(''); return; }
            const num = Number(v);
            if (max !== undefined && num > max) return;
            if (min !== undefined && num < min) return;
            onChange(v);
          }}
          placeholder={hint}
          className={`input ${suffix ? 'pr-16' : ''} ${err ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-medium pointer-events-none">{suffix}</span>}
      </div>
      {hint && !err && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
      <FieldErr msg={err} />
    </div>
  );
}

function Select({ label, hint, value, onChange, options, required = false, err }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`input ${err ? 'border-red-400 dark:border-red-500' : ''}`}>
        <option value="">{hint ?? 'Select…'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldErr msg={err} />
    </div>
  );
}

function YesNo({ label, value, onChange, err, required = false }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="flex gap-3 mt-1">
        {['yes', 'no'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              value === opt
                ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white border-transparent shadow-sm'
                : `border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 ${err ? 'border-red-400 dark:border-red-500' : ''}`
            }`}>
            {opt === 'yes' ? '✅ Yes' : '❌ No'}
          </button>
        ))}
      </div>
      <FieldErr msg={err} />
    </div>
  );
}

function TextArea({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={hint} rows={3} className="input resize-none" />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function InfoBox({ color = 'blue', children }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400',
    amber:   'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  };
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm ${colors[color]}`}>
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// ── Step 1 — Basic Info ───────────────────────────────────────────────────────

function Step1({ form, set, errs }) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="label">Full Name <span className="text-red-400">*</span></label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Enter patient full name"
          className={`input ${errs.name ? 'border-red-400 dark:border-red-500' : ''}`} />
        <FieldErr msg={errs.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Age: 0–130, integer */}
        <NumField label="Age (years)" hint="0–130" value={form.age} onChange={v => set('age', v)}
          min={0} max={130} step={1} err={errs.age} />
        {/* Weight: 0–300, float */}
        <NumField label="Weight (kg)" hint="0–300 kg" value={form.weight} onChange={v => set('weight', v)}
          min={0} max={300} step={0.1} err={errs.weight} />
      </div>

      {/* BMI: 0–100, float */}
      <NumField label="BMI (IMC)" hint="0–100" value={form.imc} onChange={v => set('imc', v)}
        min={0} max={100} step={0.1} err={errs.imc} />

      {/* Marital status */}
      <div>
        <label className="label">Marital Status <span className="text-red-400">*</span></label>
        <div className="flex gap-3 mt-1">
          {['yes', 'no'].map(opt => (
            <button key={opt} type="button" onClick={() => set('isMarried', opt)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                form.isMarried === opt
                  ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white border-transparent shadow-sm'
                  : `border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 ${errs.isMarried ? 'border-red-400' : ''}`
              }`}>
              {opt === 'yes' ? '💍 Married' : '🚫 Not Married'}
            </button>
          ))}
        </div>
        <FieldErr msg={errs.isMarried} />
        {form.isMarried === 'no' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Pregnancy-related fields will be set to 0 automatically.
          </p>
        )}
      </div>

      <InfoBox color="blue">Please ensure all information is accurate for proper patient care.</InfoBox>
    </div>
  );
}

// ── Step 2 — Reproductive Health ─────────────────────────────────────────────

const CHILDREN_OPTIONS = [
  { value: '0', label: '0 — No children' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
];

function Step2({ form, set, errs }) {
  const isMarried = form.isMarried === 'yes';

  return (
    <div className="space-y-4">
      <Section title="Menstrual History">
        {/* Menarche: 0–30, integer */}
        <NumField label="Menarche Age" hint="Age at first period (0–30)" value={form.menarcheAge}
          onChange={v => set('menarcheAge', v)} min={0} max={30} step={1} err={errs.menarcheAge} />

        {/* Menopause status: binary */}
        <YesNo label="Has menopause occurred?" value={form.menopauseStatus}
          onChange={v => { set('menopauseStatus', v); if (v === 'no') set('menopauseAge', ''); }}
          err={errs.menopauseStatus} required />

        {/* Menopause age: only if menopause = yes, 0–130 */}
        {form.menopauseStatus === 'yes' && (
          <NumField label="Menopause Age" hint="Age at menopause (0–130)" value={form.menopauseAge}
            onChange={v => set('menopauseAge', v)} min={0} max={130} step={1}
            err={errs.menopauseAge} required />
        )}
        {form.menopauseStatus === 'no' && (
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <span>ℹ️</span> Menopause age will be set to 0 in the risk model.
          </div>
        )}
      </Section>

      <Section title="Pregnancy History">
        {!isMarried ? (
          <div className="flex items-center gap-2 py-2 text-gray-400 dark:text-gray-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Not applicable — patient is not married. Age at first child, children, and breastfeeding set to 0.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pregnancy: binary */}
            <YesNo label="Has the patient been pregnant?" value={form.pregnancy}
              onChange={v => { set('pregnancy', v); if (v === 'no') { set('firstChildAge', ''); set('numberOfChildren', '0'); set('breastfeedingMonths', ''); } }}
              err={errs.pregnancy} required />

            {/* Pregnancy-dependent fields */}
            {form.pregnancy === 'yes' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Age at first child: 0–130, integer */}
                  <NumField label="Age at First Child" hint="0–130" value={form.firstChildAge}
                    onChange={v => set('firstChildAge', v)} min={0} max={130} step={1}
                    err={errs.firstChildAge} />
                  {/* Children: dropdown 0–5+ */}
                  <Select label="Number of Children" hint="Select…" value={form.numberOfChildren}
                    onChange={v => set('numberOfChildren', v)} options={CHILDREN_OPTIONS}
                    err={errs.numberOfChildren} />
                </div>
                {/* Breastfeeding: binary derived from months */}
                <div>
                  <label className="label">Breastfeeding Duration</label>
                  <div className="relative">
                    <input type="number" min="0" value={form.breastfeedingMonths}
                      onChange={e => set('breastfeedingMonths', e.target.value)}
                      placeholder="e.g. 12" className="input pr-20" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-medium pointer-events-none">months</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Enter total months. Model uses binary: 1 if &gt; 0 months, 0 if none.
                  </p>
                </div>
              </>
            )}
            {form.pregnancy === 'no' && (
              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <span>ℹ️</span> Age at first child, children count, and breastfeeding will be set to 0.
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Clinical Assessment">
        <NumField label="Number of Biopsies" hint="Total biopsies performed" value={form.biopsies}
          onChange={v => set('biopsies', v)} min={0} max={50} step={1} err={errs.biopsies} />
      </Section>

      <InfoBox color="amber">This information helps assess breast cancer risk factors accurately.</InfoBox>
    </div>
  );
}

// ── Step 3 — Lifestyle & Family History ──────────────────────────────────────

const RELATION_OPTIONS = [
  { value: 'Mother',      label: 'Mother (1st degree)' },
  { value: 'Sister',      label: 'Sister (1st degree)' },
  { value: 'Daughter',    label: 'Daughter (1st degree)' },
  { value: 'Grandmother', label: 'Grandmother (2nd degree)' },
  { value: 'Aunt',        label: 'Aunt (2nd degree)' },
  { value: 'Cousin',      label: 'Cousin (2nd degree)' },
  { value: 'Other',       label: 'Other relative (2nd degree)' },
];

const COUNT_OPTIONS = [
  { value: '1', label: '1 relative' },
  { value: '2', label: '2 relatives' },
  { value: '3', label: '3 relatives' },
];

const FIRST_DEGREE = ['Mother', 'Sister', 'Daughter'];

function Step3({ form, set, errs }) {
  const hasFamilyHistory = form.familyHistory === 'yes';
  const relCount = Number(form.familyHistoryCount) || 0;

  // Update a single relation in the array
  const setRelation = (index, value) => {
    const updated = [...(form.familyRelations || [])];
    updated[index] = value;
    set('familyRelations', updated);
  };

  // When count changes, trim or extend the relations array
  const handleCountChange = (val) => {
    set('familyHistoryCount', val);
    const n = Number(val) || 0;
    const current = form.familyRelations || [];
    if (n < current.length) {
      set('familyRelations', current.slice(0, n));
    } else {
      const extended = [...current];
      while (extended.length < n) extended.push('');
      set('familyRelations', extended);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Exercise: direct 0/1 toggle ── */}
      <Section title="Physical Activity">
        <div>
          <label className="label">Does the patient exercise regularly? <span className="text-red-400">*</span></label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            "Regularly" means ≥ 3 days per week. This maps directly to <strong>1</strong> (Yes) or <strong>0</strong> (No) in the risk model.
          </p>
          <div className="flex gap-3">
            {[{ val: '1', label: '✅ Yes — exercises regularly (≥3 days/week)' },
              { val: '0', label: '❌ No — exercises less than 3 days/week' }].map(opt => (
              <button key={opt.val} type="button" onClick={() => set('exerciseRegular', opt.val)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all text-left px-4 ${
                  form.exerciseRegular === opt.val
                    ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white border-transparent shadow-sm'
                    : `border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 ${errs.exerciseRegular ? 'border-red-400' : ''}`
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <FieldErr msg={errs.exerciseRegular} />
          {form.exerciseRegular !== '' && (
            <div className={`mt-2 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${
              form.exerciseRegular === '1'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              Model value: <strong>exercise_regular = {form.exerciseRegular}</strong>
            </div>
          )}
        </div>
      </Section>

      {/* ── Family History ── */}
      <Section title="Family History of Breast Cancer">
        <YesNo label="Does the patient have a family member with breast cancer?"
          value={form.familyHistory}
          onChange={v => {
            set('familyHistory', v);
            if (v === 'no') {
              set('familyHistoryCount', '');
              set('familyRelations', []);
            }
          }}
          err={errs.familyHistory} required />

        {hasFamilyHistory && (
          <div className="space-y-4 pt-1">
            {/* Step 1: How many relatives */}
            <Select
              label="How many relatives are affected?"
              hint="Select count…"
              value={form.familyHistoryCount}
              onChange={handleCountChange}
              options={COUNT_OPTIONS}
              required
              err={errs.familyHistoryCount}
            />

            {/* Step 2: One dropdown per relative */}
            {relCount > 0 && (
              <div className="space-y-3">
                {Array.from({ length: relCount }).map((_, i) => {
                  const rel = (form.familyRelations || [])[i] || '';
                  const isDeg1 = FIRST_DEGREE.includes(rel);
                  return (
                    <div key={i}>
                      <label className="label">
                        Relative {i + 1} — Relationship <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={rel}
                        onChange={e => setRelation(i, e.target.value)}
                        className={`input ${errs[`familyRelation_${i}`] ? 'border-red-400 dark:border-red-500' : ''}`}>
                        <option value="">Select relationship…</option>
                        {RELATION_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <FieldErr msg={errs[`familyRelation_${i}`]} />
                      {rel && (
                        <p className={`text-xs mt-1 font-medium ${isDeg1 ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          🧬 {isDeg1 ? '1st-degree relative — highest risk factor (degree = 1)' : '2nd-degree relative — moderate risk factor (degree = 2)'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {form.familyHistory === 'no' && (
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <span>ℹ️</span> Family history count and degree will be set to 0.
          </div>
        )}
      </Section>

      <InfoBox color="amber">Family history and exercise habits are key inputs for the AI risk model.</InfoBox>
    </div>
  );
}

// ── Step 4 — Medical Info ─────────────────────────────────────────────────────

function Step4({ form, set }) {
  return (
    <div className="space-y-4">
      <TextArea label="Allergies"           hint="List any known allergies"                  value={form.allergies}   onChange={v => set('allergies', v)} />
      <TextArea label="Medical History"     hint="Previous diagnoses, surgeries, conditions" value={form.history}     onChange={v => set('history', v)} />
      <TextArea label="Current Medications" hint="List all current medications and dosages"  value={form.medications} onChange={v => set('medications', v)} />
      <TextArea label="Additional Notes"    hint="Any other relevant information"            value={form.comments}    onChange={v => set('comments', v)} />
      <InfoBox color="emerald">Review all information before saving the patient record.</InfoBox>
    </div>
  );
}
