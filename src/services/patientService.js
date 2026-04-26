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
 */
export async function uploadPatientImage({
  patientId,
  patientName,
  radiologistId,
  file,
  imageType,   // 'mammogram' | 'ultrasound'
}) {
  const url = await uploadImage(file, patientId, imageType);
  if (!url) throw new Error('Upload to Supabase failed');

  await addDoc(collection(db, IMAGES), {
    patientId,
    patientName,
    doctorId:   radiologistId,   // same field Flutter reads
    imageType,
    imageUrl:   url,
    fileName:   file.name,
    uploadedAt: serverTimestamp(),
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
