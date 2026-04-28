import { useState } from 'react';

/**
 * ConsentModal
 *
 * Shown before an image upload is processed.
 * The clinician must acknowledge all three consent items before proceeding.
 *
 * Props:
 *   patientName  – string, displayed in the header
 *   scanLabel    – string, the scan label chosen by the user
 *   imageType    – 'mammogram' | 'ultrasound' | 'both'
 *   onConfirm()  – called when the user clicks "Confirm & Upload"
 *   onCancel()   – called when the user clicks "Cancel"
 */
export default function ConsentModal({ patientName, scanLabel, imageType, onConfirm, onCancel }) {
  const [checks, setChecks] = useState({ identity: false, analysis: false, privacy: false });

  const allChecked = checks.identity && checks.analysis && checks.privacy;

  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const imageLabel =
    imageType === 'mammogram' ? 'Mammogram (CC + MLO)'
    : imageType === 'ultrasound' ? 'Ultrasound'
    : 'Mammogram + Ultrasound (multi-modal)';

  const ITEMS = [
    {
      key: 'identity',
      icon: '🪪',
      title: 'Patient Identity Verified',
      desc: `I confirm that the images being uploaded belong to ${patientName || 'this patient'} and that the patient has been correctly identified.`,
    },
    {
      key: 'analysis',
      icon: '🤖',
      title: 'Consent to AI Analysis',
      desc: 'The patient (or their legal guardian) has been informed that their medical images will be processed by an AI system to assist in clinical decision-making. AI results are advisory and must be reviewed by a qualified clinician.',
    },
    {
      key: 'privacy',
      icon: '🔒',
      title: 'Data Privacy Acknowledgment',
      desc: 'The patient has consented to the storage and processing of their medical images and associated data in accordance with applicable data-protection regulations (GDPR / HIPAA). Data will not be shared with third parties without explicit consent.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        {/* Header */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-violet-600" />
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 id="consent-title" className="text-base font-bold text-gray-900 dark:text-white">
                Consent &amp; Verification Required
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Please confirm the following before uploading{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{imageLabel}</span>
                {scanLabel ? (
                  <> for <span className="font-semibold text-gray-700 dark:text-gray-300">"{scanLabel}"</span></>
                ) : null}.
              </p>
            </div>
          </div>
        </div>

        {/* Consent items */}
        <div className="px-6 py-5 space-y-3">
          {ITEMS.map(({ key, icon, title, desc }) => {
            const checked = checks[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`w-full flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all ${
                  checked
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                aria-pressed={checked}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  checked
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${
                    checked ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    <span className="mr-1.5">{icon}</span>{title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${(Object.values(checks).filter(Boolean).length / 3) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
              {Object.values(checks).filter(Boolean).length}/3
            </span>
          </div>
          {!allChecked && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Please acknowledge all items to proceed.
              </p>
              <button
                type="button"
                onClick={() => setChecks({ identity: true, analysis: true, privacy: true })}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 transition-colors flex-shrink-0 ml-3"
              >
                Accept all
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!allChecked}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              allChecked
                ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white shadow-sm hover:opacity-90'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Confirm &amp; Upload
          </button>
        </div>
      </div>
    </div>
  );
}
