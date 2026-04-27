import { useState, useRef } from 'react';
import { validateImage } from '../../services/apiService';

// ── Validation states ──────────────────────────────────────────────────────────
const VS = { idle: 'idle', checking: 'checking', valid: 'valid', invalid: 'invalid', error: 'error' };

// ── Single image slot ──────────────────────────────────────────────────────────
function ImageSlot({ slotLabel, slotHint, file, preview, validationState, validationData,
  dragging, onDragOver, onDragLeave, onDrop, onFileChange, onClear, onValidate, inputRef, disabled }) {

  const scorePct = Math.round((validationData?.score ?? 0) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{slotLabel}</span>
        {validationState === VS.valid && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Validated {scorePct}%
          </span>
        )}
        {(validationState === VS.invalid || validationState === VS.error) && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Invalid
          </span>
        )}
      </div>

      {!preview ? (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
            disabled
              ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              : dragging
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 scale-[1.01] cursor-pointer'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/40 dark:hover:bg-rose-900/10 cursor-pointer'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              dragging ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}>
              <svg className={`w-5 h-5 ${dragging ? 'text-rose-500' : 'text-gray-400 dark:text-gray-500'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 font-semibold text-xs">{slotHint}</p>
              <p className="text-gray-400 dark:text-gray-600 text-xs mt-0.5">PNG, JPG · Max 10 MB</p>
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-700">
          <img src={preview} alt={slotLabel} className="w-full h-32 object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <button type="button" onClick={onClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xs transition-all">
            ✕
          </button>
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            {validationState === VS.idle && (
              <button type="button" onClick={onValidate}
                className="w-full py-1 px-2 bg-violet-600/90 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-all">
                Validate
              </button>
            )}
            {validationState === VS.checking && (
              <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-black/60 rounded-lg">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white text-xs font-medium">Validating…</span>
              </div>
            )}
            {validationState === VS.valid && (
              <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-emerald-600/90 rounded-lg">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white text-xs font-semibold">Valid · {scorePct}%</span>
              </div>
            )}
            {(validationState === VS.invalid || validationState === VS.error) && (
              <button type="button" onClick={onValidate}
                className="w-full py-1 px-2 bg-red-600/90 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all">
                Re-validate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ImageUploader ─────────────────────────────────────────────────────────
/**
 * Supports: mammogram only, ultrasound only, or both together.
 * Mammogram always requires CC + MLO both validated.
 * Ultrasound is a single image.
 *
 * onUpload(files, imageType, scanLabel, validationScores)
 *   imageType: 'mammogram' | 'ultrasound' | 'both'
 *   files: { cc, mlo } | { single } | { cc, mlo, single }
 */
export default function ImageUploader({ onUpload, uploading = false }) {
  const [wantMammo, setWantMammo] = useState(true);
  const [wantUs,    setWantUs]    = useState(false);
  const [scanLabel, setScanLabel] = useState('');

  // CC slot
  const [ccFile,  setCcFile]  = useState(null);
  const [ccPrev,  setCcPrev]  = useState(null);
  const [ccVS,    setCcVS]    = useState(VS.idle);
  const [ccVData, setCcVData] = useState(null);
  const [ccDrag,  setCcDrag]  = useState(false);
  const ccRef = useRef(null);

  // MLO slot
  const [mloFile,  setMloFile]  = useState(null);
  const [mloPrev,  setMloPrev]  = useState(null);
  const [mloVS,    setMloVS]    = useState(VS.idle);
  const [mloVData, setMloVData] = useState(null);
  const [mloDrag,  setMloDrag]  = useState(false);
  const mloRef = useRef(null);

  // Ultrasound slot
  const [usFile,  setUsFile]  = useState(null);
  const [usPrev,  setUsPrev]  = useState(null);
  const [usVS,    setUsVS]    = useState(VS.idle);
  const [usVData, setUsVData] = useState(null);
  const [usDrag,  setUsDrag]  = useState(false);
  const usRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const readFile = (f, setFile, setPrev, setVS, setVData) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (f.size > 10 * 1024 * 1024)   { alert('File too large. Max 10 MB.');    return; }
    setFile(f); setVS(VS.idle); setVData(null);
    const r = new FileReader();
    r.onload = e => setPrev(e.target.result);
    r.readAsDataURL(f);
  };

  const clearSlot = (setFile, setPrev, setVS, setVData, ref) => {
    setFile(null); setPrev(null); setVS(VS.idle); setVData(null);
    if (ref.current) ref.current.value = '';
  };

  const validate = async (file, type, setVS, setVData) => {
    if (!file) return;
    setVS(VS.checking); setVData(null);
    try {
      const result = await validateImage(file, type);
      setVData(result);
      setVS(result.isValid ? VS.valid : VS.invalid);
    } catch (err) {
      setVData({ isValid: false, score: 0, message: err.message });
      setVS(VS.error);
    }
  };

  const clearMammo = () => {
    clearSlot(setCcFile,  setCcPrev,  setCcVS,  setCcVData,  ccRef);
    clearSlot(setMloFile, setMloPrev, setMloVS, setMloVData, mloRef);
  };

  const clearUs = () => clearSlot(setUsFile, setUsPrev, setUsVS, setUsVData, usRef);

  const handleToggleMammo = (checked) => {
    setWantMammo(checked);
    if (!checked) clearMammo();
    // Must select at least one
    if (!checked && !wantUs) setWantUs(true);
  };

  const handleToggleUs = (checked) => {
    setWantUs(checked);
    if (!checked) clearUs();
    if (!checked && !wantMammo) setWantMammo(true);
  };

  // ── Readiness ──────────────────────────────────────────────────────────────
  const mammoReady = !wantMammo || (ccVS === VS.valid && mloVS === VS.valid);
  const usReady    = !wantUs    || usVS === VS.valid;
  const canUpload  = (wantMammo || wantUs) && mammoReady && usReady && !uploading;

  // Hint for what's still missing
  const hints = [];
  if (wantMammo) {
    if (!ccFile)              hints.push('Upload CC view');
    else if (ccVS !== VS.valid)  hints.push('Validate CC view');
    if (!mloFile)             hints.push('Upload MLO view');
    else if (mloVS !== VS.valid) hints.push('Validate MLO view');
  }
  if (wantUs) {
    if (!usFile)              hints.push('Upload ultrasound');
    else if (usVS !== VS.valid)  hints.push('Validate ultrasound');
  }

  const handleUpload = () => {
    if (!canUpload) return;
    const label = scanLabel.trim() || (
      wantMammo && wantUs ? 'Mammogram + Ultrasound' :
      wantMammo ? 'Mammogram Scan' : 'Ultrasound Scan'
    );
    const files = {};
    const scores = {};
    if (wantMammo) { files.cc = ccFile; files.mlo = mloFile; scores.cc = ccVData?.score ?? 0; scores.mlo = mloVData?.score ?? 0; }
    if (wantUs)    { files.single = usFile; scores.single = usVData?.score ?? 0; }
    const type = wantMammo && wantUs ? 'both' : wantMammo ? 'mammogram' : 'ultrasound';
    onUpload(files, type, label, scores);
  };

  const uploadLabel = wantMammo && wantUs ? 'Upload Mammogram + Ultrasound'
    : wantMammo ? 'Upload Mammogram (CC + MLO)'
    : 'Upload Ultrasound';

  return (
    <div className="space-y-4">

      {/* ── Scan type selector (checkboxes — can pick both) ─────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Scan Type</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'mammo', label: 'Mammogram (CC + MLO)', checked: wantMammo, onChange: handleToggleMammo, color: 'rose' },
            { key: 'us',    label: 'Ultrasound',           checked: wantUs,    onChange: handleToggleUs,    color: 'violet' },
          ].map(({ key, label, checked, onChange, color }) => (
            <button key={key} type="button" onClick={() => onChange(!checked)}
              className={`flex items-center gap-2.5 py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all text-left ${
                checked
                  ? color === 'rose'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                    : 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                checked
                  ? color === 'rose' ? 'border-rose-500 bg-rose-500' : 'border-violet-500 bg-violet-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>}
              </div>
              {label}
            </button>
          ))}
        </div>
        {wantMammo && wantUs && (
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1.5 font-medium">
            <span>✨</span> Multi-modal — mammogram + ultrasound will both be uploaded and analysed together.
          </p>
        )}
      </div>

      {/* ── Scan label ──────────────────────────────────────────────────────── */}
      <div>
        <label className="label">Scan Label <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
        <input type="text" value={scanLabel} onChange={e => setScanLabel(e.target.value)}
          placeholder="e.g. Initial Screening, Follow-up #2…"
          maxLength={60} className="input text-sm" />
      </div>

      {/* ── Mammogram: CC + MLO slots ────────────────────────────────────────── */}
      {wantMammo && (
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Mammogram Views <span className="text-red-400 font-normal normal-case">— both CC and MLO required</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ImageSlot
              slotLabel="CC View" slotHint="Cranio-caudal"
              file={ccFile} preview={ccPrev} validationState={ccVS} validationData={ccVData} dragging={ccDrag}
              onDragOver={e => { e.preventDefault(); setCcDrag(true); }}
              onDragLeave={() => setCcDrag(false)}
              onDrop={e => { e.preventDefault(); setCcDrag(false); readFile(e.dataTransfer.files[0], setCcFile, setCcPrev, setCcVS, setCcVData); }}
              onFileChange={e => readFile(e.target.files[0], setCcFile, setCcPrev, setCcVS, setCcVData)}
              onClear={() => clearSlot(setCcFile, setCcPrev, setCcVS, setCcVData, ccRef)}
              onValidate={() => validate(ccFile, 'mammogram', setCcVS, setCcVData)}
              inputRef={ccRef} disabled={false}
            />
            <ImageSlot
              slotLabel="MLO View" slotHint="Medio-lateral oblique"
              file={mloFile} preview={mloPrev} validationState={mloVS} validationData={mloVData} dragging={mloDrag}
              onDragOver={e => { e.preventDefault(); setMloDrag(true); }}
              onDragLeave={() => setMloDrag(false)}
              onDrop={e => { e.preventDefault(); setMloDrag(false); readFile(e.dataTransfer.files[0], setMloFile, setMloPrev, setMloVS, setMloVData); }}
              onFileChange={e => readFile(e.target.files[0], setMloFile, setMloPrev, setMloVS, setMloVData)}
              onClear={() => clearSlot(setMloFile, setMloPrev, setMloVS, setMloVData, mloRef)}
              onValidate={() => validate(mloFile, 'mammogram', setMloVS, setMloVData)}
              inputRef={mloRef} disabled={false}
            />
          </div>
        </div>
      )}

      {/* ── Ultrasound slot ──────────────────────────────────────────────────── */}
      {wantUs && (
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ultrasound</p>
          <ImageSlot
            slotLabel="Ultrasound Image" slotHint="Drop image or click to browse"
            file={usFile} preview={usPrev} validationState={usVS} validationData={usVData} dragging={usDrag}
            onDragOver={e => { e.preventDefault(); setUsDrag(true); }}
            onDragLeave={() => setUsDrag(false)}
            onDrop={e => { e.preventDefault(); setUsDrag(false); readFile(e.dataTransfer.files[0], setUsFile, setUsPrev, setUsVS, setUsVData); }}
            onFileChange={e => readFile(e.target.files[0], setUsFile, setUsPrev, setUsVS, setUsVData)}
            onClear={() => clearSlot(setUsFile, setUsPrev, setUsVS, setUsVData, usRef)}
            onValidate={() => validate(usFile, 'ultrasound', setUsVS, setUsVData)}
            inputRef={usRef} disabled={false}
          />
        </div>
      )}

      {/* ── Missing items hint ───────────────────────────────────────────────── */}
      {hints.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-amber-700 dark:text-amber-400 text-xs font-medium">
            Still needed: {hints.join(' · ')}
          </p>
        </div>
      )}

      {/* ── Upload button ────────────────────────────────────────────────────── */}
      <button type="button" onClick={handleUpload} disabled={!canUpload}
        className="btn-primary w-full py-3 shadow-glow-rose disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
        {uploading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {uploadLabel}
          </>
        )}
      </button>
    </div>
  );
}
