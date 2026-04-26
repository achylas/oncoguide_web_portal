import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signUpRadiologist({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'radiologists', cred.user.uid), {
    uid:       cred.user.uid,
    name,
    email,
    role:      'radiologist',
    createdAt: serverTimestamp(),
    isActive:  true,
  });
  return cred.user;
}

export async function loginRadiologist({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  // Verify role
  const snap = await getDoc(doc(db, 'radiologists', cred.user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    throw new Error('Account not found. Please sign up as a radiologist.');
  }
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}
