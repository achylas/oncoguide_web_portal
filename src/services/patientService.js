import {
  collection, addDoc, getDocs, doc, getDoc,
  query, orderBy, serverTimestamp, updateDoc, deleteDoc, writeBatch,
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

/**
 * Delete a patient and ALL associated data:
 * - patient document
 * - all patient_images documents
 * - all radiologist_reports documents
 * Firestore batches are capped at 500 ops; we chunk if needed.
 */
export async function deletePatient(patientId) {
  // Collect all docs to delete
  const [imagesSnap, reportsSnap] = await Promise.all([
    getDocs(query(collection(db, 'patient_images'))),
    getDocs(query(collection(db, 'radiologist_reports'))),
  ]);

  const imageIds  = imagesSnap.docs.filter(d => d.data().patientId === patientId).map(d => d.ref);
  const reportIds = reportsSnap.docs.filter(d => d.data().patientId === patientId).map(d => d.ref);
  const allRefs   = [...imageIds, ...reportIds, doc(db, PATIENTS, patientId)];

  // Delete in chunks of 500 (Firestore batch limit)
  for (let i = 0; i < allRefs.length; i += 500) {
    const batch = writeBatch(db);
    allRefs.slice(i, i + 500).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
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
 * reportType: 'mammogram_density' | 'risk_assessment' | 'combined' | 'ultrasound_only'
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
  // ultrasound fields
  usPrediction,
  usPredictionIndex,
  usConfidence,
  usProbabilities,
  // risk fields
  riskLabel,
  riskPercentage,
  riskPrediction,
  // image refs
  ccImageUrl,
  mloImageUrl,
  ultrasoundUrl,
  gradcamImage,
  // scan label
  scanLabel,
  // radiologist comment (present when AI confidence < 60 %)
  radiologistComment,
}) {
  const ref = await addDoc(collection(db, REPORTS), {
    patientId,
    patientName,
    radiologistId,
    reportType,
    // density
    densityClass:         densityClass         ?? null,
    densityLabel:         densityLabel         ?? null,
    densityIndex:         densityIndex         ?? null,
    densityConfidence:    densityConfidence    ?? null,
    // mammogram finding
    mammoPrediction:      mammoPrediction      ?? null,
    mammoPredictionIndex: mammoPredictionIndex ?? null,
    mammoConfidence:      mammoConfidence      ?? null,
    mammoProbabilities:   mammoProbabilities   ?? null,
    mammoFindingCategory: mammoFindingCategory ?? null,
    // ultrasound
    usPrediction:         usPrediction         ?? null,
    usPredictionIndex:    usPredictionIndex    ?? null,
    usConfidence:         usConfidence         ?? null,
    usProbabilities:      usProbabilities      ?? null,
    // risk
    riskLabel:            riskLabel            ?? null,
    riskPercentage:       riskPercentage       ?? null,
    riskPrediction:       riskPrediction       ?? null,
    // images
    ccImageUrl:           ccImageUrl           ?? null,
    mloImageUrl:          mloImageUrl          ?? null,
    ultrasoundUrl:        ultrasoundUrl        ?? null,
    hasGradcam:           !!gradcamImage,
    scanLabel:            scanLabel            ?? 'Report',
    radiologistComment:   radiologistComment   ?? null,
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
