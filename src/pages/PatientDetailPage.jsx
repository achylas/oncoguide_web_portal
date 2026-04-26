import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, getPatientImages, uploadPatientImage } from '../services/patientService';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import ImageUploader from '../components/images/ImageUploader';

const TABS = [
  { label: 'Clinical Data', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { label: 'Images',        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
];

export default function PatientDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [patient,   setPatient]   = useState(null);
  const [images,    setImages]    = useState([]);
  const [tab,       setTab]       = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [lightbox,  setLightbox]  = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, imgs] = await Promise.all([getPatient(id), getPatientImages(id)]);
        if (!p) { navigate('/patients'); return; }
        setPatient(p); setImages(imgs);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id, navigate]);

  const handleUpload = async (file, imageType) => {
    setUploading(true); setUploadMsg('');
    try {
      await uploadPatientImage({ patientId: id, patientName: patient.name, radiologistId: user.uid, file, imageType });
      const imgs = await getPatientImages(id);
      setImages(imgs);
      setUploadMsg('success');
      setTimeout(() => setUploadMsg(''), 4000);
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
          <p className="text-gray-400 text-sm">Loading patient...</p>
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
      <button onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-5 transition-colors font-medium">
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
            <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <StatPill label="Age"      value={patient.age ? `${patient.age} yrs` : '—'} />
              <StatPill label="Weight"   value={patient.weight ? `${patient.weight} kg` : '—'} />
              <StatPill label="BMI"      value={patient.clinicalAssessment?.imc ?? '—'} />
              <StatPill label="Biopsies" value={patient.clinicalAssessment?.biopsies ?? '0'} />
              <StatPill label="Images"   value={images.length} accent />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 p-1 rounded-xl mb-6 w-fit shadow-card">
        {TABS.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === i
                ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className={tab === i ? 'text-white' : 'text-gray-400'}>{t.icon}</span>
            {t.label}
            {i === 1 && images.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === i ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                {images.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 0 && <ClinicalTab patient={patient} />}
      {tab === 1 && (
        <ImagesTab
          mammograms={mammograms} ultrasounds={ultrasounds}
          uploading={uploading} uploadMsg={uploadMsg}
          onUpload={handleUpload} onLightbox={setLightbox}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all text-lg">
            ✕
          </button>
          <img src={lightbox} alt="Full view"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
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
        <DataRow label="Age"        value={p.age ? `${p.age} years` : '—'} />
        <DataRow label="Weight"     value={p.weight ? `${p.weight} kg` : '—'} />
        <DataRow label="BMI (IMC)"  value={p.clinicalAssessment?.imc ?? '—'} />
        <DataRow label="Biopsies"   value={p.clinicalAssessment?.biopsies ?? '0'} />
      </InfoCard>

      <InfoCard title="Reproductive Health" color="rose">
        <DataRow label="Menarche Age"           value={p.reproductive?.menarcheAge ?? '—'} />
        <DataRow label="Menopause Age"          value={p.reproductive?.menopauseAge ?? '—'} />
        <DataRow label="Age at First Child"     value={p.reproductive?.firstChildAge ?? '—'} />
        <DataRow label="Number of Children"     value={p.reproductive?.numberOfChildren ?? '—'} />
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

const colorMap = {
  blue:   { dot: 'bg-blue-500',   header: 'bg-blue-50 border-blue-100',   title: 'text-blue-700' },
  rose:   { dot: 'bg-rose-500',   header: 'bg-rose-50 border-rose-100',   title: 'text-rose-700' },
  violet: { dot: 'bg-violet-500', header: 'bg-violet-50 border-violet-100', title: 'text-violet-700' },
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
    <div className="flex justify-between items-start gap-4 py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

// ── Images Tab ─────────────────────────────────────────────────────────────────

function ImagesTab({ mammograms, ultrasounds, uploading, uploadMsg, onUpload, onLightbox }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Upload — narrower */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gray-50 border-gray-100">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="font-bold text-sm text-gray-700">Upload New Image</h3>
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
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {uploadMsg === 'success' ? 'Image uploaded successfully!' : uploadMsg.replace('error:', '')}
            </div>
          )}
        </div>
      </div>

      {/* Gallery — wider */}
      <div className="lg:col-span-3 space-y-5">
        <Gallery title="Mammogram Images" color="rose"   images={mammograms}  onLightbox={onLightbox} />
        <Gallery title="Ultrasound Images" color="violet" images={ultrasounds} onLightbox={onLightbox} />
      </div>
    </div>
  );
}

function Gallery({ title, color, images, onLightbox }) {
  const c = colorMap[color];
  return (
    <div className="card overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${c.header}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${c.dot}`} />
          <h3 className={`font-bold text-sm ${c.title}`}>{title}</h3>
        </div>
        <span className={`badge ${c.header} ${c.title} border ${c.header.split(' ')[1]}`}>
          {images.length} {images.length === 1 ? 'image' : 'images'}
        </span>
      </div>
      <div className="p-4">
        {images.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map(img => (
              <button key={img.id} onClick={() => onLightbox(img.imageUrl)}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 group relative">
                <img src={img.imageUrl} alt={img.fileName ?? 'scan'}
                  className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, accent = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      accent
        ? 'bg-rose-50 text-rose-600 border-rose-200'
        : 'bg-gray-50 text-gray-600 border-gray-200'
    }`}>
      <span className="text-gray-400 font-normal">{label}</span>
      {value}
    </span>
  );
}
