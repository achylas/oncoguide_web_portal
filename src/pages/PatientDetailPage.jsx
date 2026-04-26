import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPatient, getPatientImages, getPatientReports, uploadPatientImage } from '../services/patientService';
import { uploadImage } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import ImageUploader from '../components/images/ImageUploader';
import ReportModal from '../components/report/ReportModal';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert a Firestore Timestamp or JS Date to a relative string like "2 weeks ago" */
function timeAgo(ts) {
  if (!ts) return 'Unknown date';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const now   = new Date();
  const secs  = Math.floor((now - date) / 1000);
  if (secs < 60)   return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs  < 24)   return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs  / 24);
  if (days < 7)    return `${days} day${days !== 1 ? 's' : ''} ago`;
  const wks  = Math.floor(days / 7);
  if (wks  < 5)    return `${wks} week${wks !== 1 ? 's' : ''} ago`;
  const mos  = Math.floor(days / 30);
  if (mos  < 12)   return `${mos} month${mos !== 1 ? 's' : ''} ago`;
  const yrs  = Math.floor(days / 365);
  return `${yrs} year${yrs !== 1 ? 's' : ''} ago`;
}

/** Format a Firestore Timestamp to "Jan 15, 2025 · 14:32" */
function formatDate(ts) {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Group images by calendar date string "Jan 15, 2025" */
function groupByDate(images) {
  const groups = {};
  images.forEach(img => {
    const ts   = img.uploadedAt;
    const date = ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
    const key  = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(img);
  });
  // Return as sorted array of { dateLabel, items }
  return Object.entries(groups)
    .map(([dateLabel, items]) => ({ dateLabel, items }))
    .sort((a, b) => {
      const da = a.items[0]?.uploadedAt?.toDate?.() ?? new Date(0);
      const db = b.items[0]?.uploadedAt?.toDate?.() ?? new Date(0);
      return db - da; // newest first
    });
}

const TABS = [
  {
    label: 'Clinical Data',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    label: 'Imaging History',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'Reports',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient,   setPatient]   = useState(null);
  const [images,    setImages]    = useState([]);
  const [reports,   setReports]   = useState([]);
  const [tab,       setTab]       = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');  // 'success' | 'error:...' | ''
  const [lightbox,  setLightbox]  = useState(null); // full image object
  // Report modal state
  const [reportModal, setReportModal] = useState(null); // { ccFile, mloFile, ccUrl, mloUrl, scanLabel }

  useEffect(() => {
    async function load() {
      try {
        const [p, imgs, rpts] = await Promise.all([
          getPatient(id),
          getPatientImages(id),
          getPatientReports(id),
        ]);
        if (!p) { navigate('/patients'); return; }
        setPatient(p);
        setImages(imgs);
        setReports(rpts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const handleUpload = async (files, imageType, scanLabel, validationScores) => {
    setUploading(true);
    setUploadMsg('');
    try {
      if (imageType === 'mammogram') {
        // Upload CC and MLO separately
        const [ccUrl, mloUrl] = await Promise.all([
          uploadImage(files.cc,  id, 'mammogram'),
          uploadImage(files.mlo, id, 'mammogram'),
        ]);
        if (!ccUrl || !mloUrl) throw new Error('Upload to Supabase failed');

        // Save both image records
        await Promise.all([
          addDoc(collection(db, 'patient_images'), {
            patientId: id, patientName: patient.name, doctorId: user.uid,
            imageType: 'mammogram', imageUrl: ccUrl, fileName: files.cc.name,
            scanLabel: `${scanLabel} (CC)`, validationScore: Math.round((validationScores.cc ?? 0) * 100),
            uploadedAt: serverTimestamp(),
          }),
          addDoc(collection(db, 'patient_images'), {
            patientId: id, patientName: patient.name, doctorId: user.uid,
            imageType: 'mammogram', imageUrl: mloUrl, fileName: files.mlo.name,
            scanLabel: `${scanLabel} (MLO)`, validationScore: Math.round((validationScores.mlo ?? 0) * 100),
            uploadedAt: serverTimestamp(),
          }),
        ]);

        const imgs = await getPatientImages(id);
        setImages(imgs);
        setUploadMsg('success');
        setTimeout(() => setUploadMsg(''), 5000);

        // Offer to generate report
        setReportModal({ ccFile: files.cc, mloFile: files.mlo, ccUrl, mloUrl, scanLabel });

      } else {
        // Ultrasound — single file
        await uploadPatientImage({
          patientId: id, patientName: patient.name, radiologistId: user.uid,
          file: files.single, imageType: 'ultrasound',
          scanLabel, validationScore: validationScores.single ?? 0,
        });
        const imgs = await getPatientImages(id);
        setImages(imgs);
        setUploadMsg('success');
        setTimeout(() => setUploadMsg(''), 5000);
      }
    } catch (err) {
      setUploadMsg('error:' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <PageLayout>
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading patient…</p>
        </div>
      </div>
    </PageLayout>
  );

  if (!patient) return null;

  const mammograms  = images.filter(i => i.imageType === 'mammogram');
  const ultrasounds = images.filter(i => i.imageType === 'ultrasound');
  const initials    = patient.name?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <PageLayout>
      {/* Back */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-5 transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </button>

      {/* Hero header */}
      <div className="card overflow-hidden mb-6">
        <div className="h-2 bg-brand" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{patient.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <StatPill label="Age"        value={patient.age    ? `${patient.age} yrs`    : '—'} />
              <StatPill label="Weight"     value={patient.weight ? `${patient.weight} kg`  : '—'} />
              <StatPill label="BMI"        value={patient.clinicalAssessment?.imc           ?? '—'} />
              <StatPill label="Biopsies"   value={patient.clinicalAssessment?.biopsies      ?? '0'} />
              <StatPill label="Mammograms" value={mammograms.length}  accent />
              <StatPill label="Ultrasounds" value={ultrasounds.length} accent />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-1 rounded-xl mb-6 w-fit shadow-card">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === i
                ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className={tab === i ? 'text-white' : 'text-gray-400 dark:text-gray-500'}>{t.icon}</span>
            {t.label}
            {i === 1 && images.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === i ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
              }`}>
                {images.length}
              </span>
            )}
            {i === 2 && reports.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === i ? 'bg-white/20 text-white' : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
              }`}>
                {reports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <ClinicalTab patient={patient} />}
      {tab === 1 && (
        <ImagingHistoryTab
          mammograms={mammograms}
          ultrasounds={ultrasounds}
          uploading={uploading}
          uploadMsg={uploadMsg}
          onUpload={handleUpload}
          onLightbox={setLightbox}
        />
      )}
      {tab === 2 && <ReportsTab reports={reports} />}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox img={lightbox} onClose={() => setLightbox(null)} />
      )}

      {/* Report generation modal — shown after mammogram upload */}
      {reportModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Generate Report?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Both CC and MLO images are uploaded. Generate an AI density + risk report now?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReportModal(null)}
                className="btn-secondary flex-1 py-2.5"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const m = reportModal;
                  setReportModal(null);
                  // Small delay so the prompt modal closes first
                  setTimeout(() => setReportModal({ ...m, generating: true }), 100);
                }}
                className="btn-primary flex-1 py-2.5"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual report generation modal */}
      {reportModal?.generating && (
        <ReportModal
          patient={patient}
          ccFile={reportModal.ccFile}
          mloFile={reportModal.mloFile}
          ccImageUrl={reportModal.ccUrl}
          mloImageUrl={reportModal.mloUrl}
          scanLabel={reportModal.scanLabel}
          onClose={async () => {
            setReportModal(null);
            const rpts = await getPatientReports(id);
            setReports(rpts);
          }}
          onSaved={async () => {
            const rpts = await getPatientReports(id);
            setReports(rpts);
          }}
        />
      )}
    </PageLayout>
  );
}

// ── Clinical Tab ───────────────────────────────────────────────────────────────

function ClinicalTab({ patient: p }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <InfoCard title="Basic Information" color="blue">
        <DataRow label="Full Name"  value={p.name} />
        <DataRow label="Age"        value={p.age    ? `${p.age} years`   : '—'} />
        <DataRow label="Weight"     value={p.weight ? `${p.weight} kg`   : '—'} />
        <DataRow label="BMI (IMC)"  value={p.clinicalAssessment?.imc     ?? '—'} />
        <DataRow label="Biopsies"   value={p.clinicalAssessment?.biopsies ?? '0'} />
      </InfoCard>

      <InfoCard title="Reproductive Health" color="rose">
        <DataRow label="Menarche Age"           value={p.reproductive?.menarcheAge         ?? '—'} />
        <DataRow label="Menopause Age"          value={p.reproductive?.menopauseAge        ?? '—'} />
        <DataRow label="Age at First Child"     value={p.reproductive?.firstChildAge       ?? '—'} />
        <DataRow label="Number of Children"     value={p.reproductive?.numberOfChildren    ?? '—'} />
        <DataRow label="Breastfeeding (months)" value={p.reproductive?.breastfeedingMonths ?? '—'} />
      </InfoCard>

      <InfoCard title="Medical History" color="violet" className="lg:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <DataRow label="Allergies"   value={p.medical?.allergies   || 'None reported'} />
          <DataRow label="History"     value={p.medical?.history     || 'None reported'} />
          <DataRow label="Medications" value={p.medical?.medications || 'None reported'} />
          <DataRow label="Notes"       value={p.medical?.comments    || '—'} />
        </div>
      </InfoCard>
    </div>
  );
}

// ── Imaging History Tab ────────────────────────────────────────────────────────

function ImagingHistoryTab({ mammograms, ultrasounds, uploading, uploadMsg, onUpload, onLightbox }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'mammogram' | 'ultrasound'

  const allImages = [...mammograms, ...ultrasounds].sort((a, b) => {
    const da = a.uploadedAt?.toDate?.() ?? new Date(0);
    const db = b.uploadedAt?.toDate?.() ?? new Date(0);
    return db - da;
  });

  const filtered = activeFilter === 'all'
    ? allImages
    : allImages.filter(i => i.imageType === activeFilter);

  const groups = groupByDate(filtered);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* ── Upload panel ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gray-50 border-gray-100">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="font-bold text-sm text-gray-700">Upload New Scan</h3>
          </div>
          <div className="p-5">
            <ImageUploader onUpload={onUpload} uploading={uploading} />
            {uploadMsg && (
              <div className={`mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                uploadMsg.startsWith('error')
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                {uploadMsg.startsWith('error') ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {uploadMsg === 'success' ? 'Scan uploaded and saved to history!' : uploadMsg.replace('error:', '')}
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Scan Summary</p>
          <div className="space-y-3">
            <SummaryBar label="Mammograms"  count={mammograms.length}  total={allImages.length} color="bg-rose-500" />
            <SummaryBar label="Ultrasounds" count={ultrasounds.length} total={allImages.length} color="bg-violet-500" />
          </div>
          {allImages.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Last scan: <span className="font-semibold text-gray-600 dark:text-gray-300">{timeAgo(allImages[0]?.uploadedAt)}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all',        label: `All (${allImages.length})` },
            { key: 'mammogram',  label: `Mammograms (${mammograms.length})` },
            { key: 'ultrasound', label: `Ultrasounds (${ultrasounds.length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === f.key
                  ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline groups */}
        {groups.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold">No scans yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload the first scan using the panel on the left.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ dateLabel, items }) => (
              <TimelineGroup
                key={dateLabel}
                dateLabel={dateLabel}
                items={items}
                onLightbox={onLightbox}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline Group ─────────────────────────────────────────────────────────────

function TimelineGroup({ dateLabel, items }) {
  // relative time from the first item in the group
  const relTime = timeAgo(items[0]?.uploadedAt);

  return (
    <div>
      {/* Date header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{dateLabel}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{relTime}</span>
        </div>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {items.length} scan{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {items.map(img => (
          <ScanCard key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}

// ── Scan Card ──────────────────────────────────────────────────────────────────

function ScanCard({ img }) {
  const [expanded, setExpanded] = useState(false);
  const isMammo = img.imageType === 'mammogram';
  const accent  = isMammo ? 'rose' : 'violet';

  const accentMap = {
    rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   dot: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
  };
  const c = accentMap[accent];

  const scorePct = img.validationScore ?? 0; // already 0–100

  return (
    <div className={`card overflow-hidden border ${c.border}`}>
      <div className="flex items-start gap-4 p-4">
        {/* Thumbnail */}
        <button
          onClick={() => setExpanded(true)}
          className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-90 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
        >
          <img
            src={img.imageUrl}
            alt={img.scanLabel ?? img.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                {img.scanLabel || 'Scan'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(img.uploadedAt)}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${c.badge}`}>
              {img.imageType}
            </span>
          </div>

          {/* Validation score bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 dark:text-gray-500 font-medium">AI Validation</span>
              <span className={`font-bold ${scorePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : scorePct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                {scorePct}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  scorePct >= 80 ? 'bg-emerald-500' : scorePct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          {/* File name */}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 truncate">
            {img.fileName}
          </p>
        </div>
      </div>

      {/* Expanded full image */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all text-lg"
          >
            ✕
          </button>
          {/* Metadata overlay */}
          <div className="absolute top-5 left-5 bg-black/60 rounded-2xl px-4 py-3 max-w-xs">
            <p className="text-white font-bold text-sm">{img.scanLabel || 'Scan'}</p>
            <p className="text-white/60 text-xs mt-0.5">{formatDate(img.uploadedAt)}</p>
            <p className="text-white/60 text-xs">{timeAgo(img.uploadedAt)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${c.badge}`}>
                {img.imageType}
              </span>
              <span className={`text-xs font-bold ${scorePct >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                AI: {scorePct}%
              </span>
            </div>
          </div>
          <img
            src={img.imageUrl}
            alt={img.scanLabel ?? img.fileName}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ── Lightbox (kept for any external usage) ─────────────────────────────────────

function Lightbox({ img, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all text-lg"
      >
        ✕
      </button>
      <img
        src={typeof img === 'string' ? img : img?.imageUrl}
        alt="Full view"
        className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

const colorMap = {
  blue:   { dot: 'bg-blue-500',   header: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50',     title: 'text-blue-700 dark:text-blue-400' },
  rose:   { dot: 'bg-rose-500',   header: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50',     title: 'text-rose-700 dark:text-rose-400' },
  violet: { dot: 'bg-violet-500', header: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/50', title: 'text-violet-700 dark:text-violet-400' },
};

function InfoCard({ title, color = 'blue', children, className = '' }) {
  const c = colorMap[color];
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${c.header}`}>
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <h3 className={`font-bold text-sm ${c.title}`}>{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-gray-400 dark:text-gray-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-gray-900 dark:text-white text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

function StatPill({ label, value, accent = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      accent
        ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }`}>
      <span className="text-gray-400 dark:text-gray-500 font-normal">{label}</span>
      {value}
    </span>
  );
}

function SummaryBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        <span className="text-gray-400 dark:text-gray-500">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────────

const DENSITY_COLORS_MAP = {
  0: { badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
  1: { badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',             bar: 'bg-blue-500' },
  2: { badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',         bar: 'bg-amber-500' },
  3: { badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',                 bar: 'bg-red-500' },
};

function ReportsTab({ reports }) {
  if (reports.length === 0) {
    return (
      <div className="card p-16 text-center">
        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-semibold">No reports yet</p>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
          Upload CC + MLO mammogram images and generate a report from the Imaging History tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-gray-900 dark:text-white">Radiologist Reports</h2>
        <span className="badge bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
          {reports.length} report{reports.length !== 1 ? 's' : ''}
        </span>
      </div>
      {reports.map(r => <ReportCard key={r.id} report={r} />)}
    </div>
  );
}

function ReportCard({ report: r }) {
  const di = r.densityIndex ?? 0;
  const dc = DENSITY_COLORS_MAP[di] ?? DENSITY_COLORS_MAP[0];
  const isHighRisk = r.riskPrediction === 1;
  const date = r.createdAt?.toDate
    ? r.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const relTime = timeAgo(r.createdAt);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{r.scanLabel || 'Report'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date} · {relTime}</p>
        </div>
        <span className="badge bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 text-xs">
          By Radiologist
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Density */}
        {r.densityClass && (
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Breast Density</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dc.badge}`}>
                BI-RADS {['A','B','C','D'][di]}
              </span>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{r.densityClass}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 dark:text-gray-500">Confidence</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{r.densityConfidence?.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${dc.bar} rounded-full`} style={{ width: `${r.densityConfidence ?? 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Risk */}
        {r.riskLabel && (
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Clinical Risk</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isHighRisk
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
              }`}>
                {r.riskLabel}
              </span>
            </div>
            <p className={`font-black text-2xl ${isHighRisk ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {r.riskPercentage?.toFixed(1)}%
            </p>
            <div className="mt-2">
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${r.riskPercentage ?? 0}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
