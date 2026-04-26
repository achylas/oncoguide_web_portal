import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPatient } from '../services/patientService';
import PageLayout from '../components/layout/PageLayout';

const STEPS = [
  { label: 'Basic Info',          desc: 'Patient identification',    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { label: 'Reproductive Health', desc: 'Risk assessment factors',   icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
  { label: 'Medical Info',        desc: 'History & medications',     icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
];

const initialForm = {
  name:'', age:'', weight:'', imc:'',
  menarcheAge:'', menopauseAge:'', firstChildAge:'', numberOfChildren:'', breastfeedingMonths:'', biopsies:'',
  allergies:'', history:'', medications:'', comments:'',
};

export default function AddPatientPage() {
  const navigate = useNavigate();
  const [step,   setStep]   = useState(0);
  const [form,   setForm]   = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await addPatient({
        name: form.name.trim(), age: Number(form.age), weight: Number(form.weight),
        reproductive: {
          menarcheAge:         Number(form.menarcheAge)         || null,
          menopauseAge:        Number(form.menopauseAge)        || null,
          firstChildAge:       Number(form.firstChildAge)       || null,
          numberOfChildren:    Number(form.numberOfChildren)    || 0,
          breastfeedingMonths: Number(form.breastfeedingMonths) || 0,
        },
        medical: { allergies: form.allergies.trim(), history: form.history.trim(), medications: form.medications.trim(), comments: form.comments.trim() },
        clinicalAssessment: { imc: form.imc ? Number(form.imc) : null, biopsies: form.biopsies ? Number(form.biopsies) : 0 },
      });
      navigate('/patients');
    } catch (err) {
      setError(err.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      {/* Back */}
      <button onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-5 transition-colors font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </button>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Patient</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Complete all 3 steps to register the patient</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-4 space-y-1">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  i === step
                    ? 'bg-gradient-to-r from-rose-50 to-violet-50 dark:from-rose-900/20 dark:to-violet-900/20 border border-rose-100 dark:border-rose-900/40'
                    : i < step
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  i < step   ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-brand text-white' :
                               'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    i === step ? 'text-rose-600 dark:text-rose-400' :
                    i < step   ? 'text-gray-700 dark:text-gray-300' :
                                 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            {/* Step header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-500 to-violet-600 flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                {STEPS[step].icon}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{STEPS[step].label}</h2>
                <p className="text-white/70 text-sm">{STEPS[step].desc}</p>
              </div>
              <div className="ml-auto text-white/60 text-sm font-medium">
                Step {step + 1} of {STEPS.length}
              </div>
            </div>

            <div className="p-6">
              {step === 0 && <Step1 form={form} set={set} />}
              {step === 1 && <Step2 form={form} set={set} />}
              {step === 2 && <Step3 form={form} set={set} />}

              {error && (
                <div className="mt-5 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 0 && !form.name.trim()}
                  className="btn-primary flex-1 shadow-glow-rose"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 shadow-glow-rose">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save Patient</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// ── Shared field components ────────────────────────────────────────────────────

function Field({ label, hint, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={hint} className="input" />
    </div>
  );
}

function TextArea({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={hint} rows={3}
        className="input resize-none" />
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

// ── Steps ──────────────────────────────────────────────────────────────────────

function Step1({ form, set }) {
  return (
    <div className="space-y-5">
      <Field label="Full Name" hint="Enter patient full name" value={form.name} onChange={v => set('name', v)} required />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age (years)" hint="e.g. 45" value={form.age}    onChange={v => set('age', v)}    type="number" />
        <Field label="Weight (kg)" hint="e.g. 65" value={form.weight} onChange={v => set('weight', v)} type="number" />
      </div>
      <Field label="BMI (IMC)" hint="Body Mass Index e.g. 23.5" value={form.imc} onChange={v => set('imc', v)} type="number" />
      <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-3 text-blue-600 dark:text-blue-400 text-sm">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Please ensure all information is accurate for proper patient care.
      </div>
    </div>
  );
}

function Step2({ form, set }) {
  return (
    <div className="space-y-4">
      <Section title="Menstrual History">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Menarche Age"  hint="Age at first period" value={form.menarcheAge}  onChange={v => set('menarcheAge', v)}  type="number" />
          <Field label="Menopause Age" hint="If applicable"       value={form.menopauseAge} onChange={v => set('menopauseAge', v)} type="number" />
        </div>
      </Section>
      <Section title="Pregnancy History">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age at First Child"     hint="Years"       value={form.firstChildAge}       onChange={v => set('firstChildAge', v)}       type="number" />
          <Field label="Number of Children"     hint="Total"       value={form.numberOfChildren}    onChange={v => set('numberOfChildren', v)}    type="number" />
          <Field label="Breastfeeding (months)" hint="Total months" value={form.breastfeedingMonths} onChange={v => set('breastfeedingMonths', v)} type="number" />
        </div>
      </Section>
      <Section title="Clinical Assessment">
        <Field label="Number of Biopsies" hint="Total biopsies performed" value={form.biopsies} onChange={v => set('biopsies', v)} type="number" />
      </Section>
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl px-4 py-3 text-amber-700 dark:text-amber-400 text-sm">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        This information helps assess breast cancer risk factors.
      </div>
    </div>
  );
}

function Step3({ form, set }) {
  return (
    <div className="space-y-4">
      <TextArea label="Allergies"           hint="List any known allergies"                    value={form.allergies}   onChange={v => set('allergies', v)} />
      <TextArea label="Medical History"     hint="Previous diagnoses, surgeries, conditions"   value={form.history}     onChange={v => set('history', v)} />
      <TextArea label="Current Medications" hint="List all current medications and dosages"    value={form.medications} onChange={v => set('medications', v)} />
      <TextArea label="Additional Notes"    hint="Any other relevant information"              value={form.comments}    onChange={v => set('comments', v)} />
      <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-4 py-3 text-emerald-700 dark:text-emerald-400 text-sm">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Review all information before saving the patient record.
      </div>
    </div>
  );
}
