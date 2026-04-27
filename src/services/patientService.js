import {
  collection, addDoc, getDocs, doc, getDoc,
  query, orderBy, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadImage } from './supabase';

const PATIENTS = 'patients';
const IMAGES   = 'patient_images';

// ── Patients ──────────────────────────────────────────────────────────────────

export async function addPatient(data) {
  const ref = await addDoc(collection(db, PATIENTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllPatients() {
  const q    = query(collection(db, PATIENTS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPatient(id) {
  const snap = await getDoc(doc(db, PATIENTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updatePatient(id, data) {
  await updateDoc(doc(db, PATIENTS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Patient Images ────────────────────────────────────────────────────────────

/**
 * Upload image file to Supabase and save metadata to Firestore.
 * scanLabel      — human-readable label e.g. "Initial Screening", "Follow-up #2"
 * validationScore — gatekeeper confidence score (0–1)
 */
export async function uploadPatientImage({
  patientId,
  patientName,
  radiologistId,
  file,
  imageType,       // 'mammogram' | 'ultrasound'
  scanLabel = '',  // optional label from radiologist
  validationScore = 0,
}) {
  const url = await uploadImage(file, patientId, imageType);
  if (!url) throw new Error('Upload to Supabase failed');

  await addDoc(collection(db, IMAGES), {
    patientId,
    patientName,
    doctorId:        radiologistId,
    imageType,
    imageUrl:        url,
    fileName:        file.name,
    scanLabel:       scanLabel.trim() || 'Scan',
    validationScore: Math.round(validationScore * 100), // store as 0–100 integer
    uploadedAt:      serverTimestamp(),
  });

  return url;
}

export async function getPatientImages(patientId) {
  const q    = query(
    collection(db, IMAGES),
    orderBy('uploadedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.patientId === patientId);
}

// ── Radiologist Reports ───────────────────────────────────────────────────────

const REPORTS = 'radiologist_reports';

/**
 * Save a radiologist-generated report to Firestore.
 * reportType: 'mammogram_density' | 'risk_assessment' | 'combined'
 */
export async function saveRadiologistReport({
  patientId,
  patientName,
  radiologistId,
  reportType,
  // density fields
  densityClass,
  densityLabel,
  densityIndex,
  densityConfidence,
  // mammogram finding fields
  mammoPrediction,
  mammoPredictionIndex,
  mammoConfidence,
  mammoProbabilities,
  mammoFindingCategory,
  // risk fields
  riskLabel,
  riskPercentage,
  riskPrediction,
  // image refs
  ccImageUrl,
  mloImageUrl,
  gradcamImage,
  // scan label
  scanLabel,
}) {
  const ref = await addDoc(collection(db, REPORTS), {
    patientId,
    patientName,
    radiologistId,
    reportType,
    densityClass:         densityClass         ?? null,
    densityLabel:         densityLabel         ?? null,
    densityIndex:         densityIndex         ?? null,
    densityConfidence:    densityConfidence    ?? null,
    mammoPrediction:      mammoPrediction      ?? null,
    mammoPredictionIndex: mammoPredictionIndex ?? null,
    mammoConfidence:      mammoConfidence      ?? null,
    mammoProbabilities:   mammoProbabilities   ?? null,
    mammoFindingCategory: mammoFindingCategory ?? null,
    riskLabel:            riskLabel            ?? null,
    riskPercentage:       riskPercentage       ?? null,
    riskPrediction:       riskPrediction       ?? null,
    ccImageUrl:           ccImageUrl           ?? null,
    mloImageUrl:          mloImageUrl          ?? null,
    hasGradcam:           !!gradcamImage,
    scanLabel:            scanLabel            ?? 'Report',
    createdAt:            serverTimestamp(),
    source:               'radiologist_web',
  });
  return ref.id;
}

export async function getPatientReports(patientId) {
  const q    = query(
    collection(db, REPORTS),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.patientId === patientId);
}
