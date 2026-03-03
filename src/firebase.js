import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  setDoc,        // ✅ ADD THIS
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
// --- NEW AUTH IMPORTS ---
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";
// ------------------------

const firebaseConfig = {
  apiKey: "AIzaSyBPDELPQLEVwU9Rji_Mxat5K47bXlXkKf8",
  authDomain: "midesi-65562.firebaseapp.com",
  projectId: "midesi-65562",
  storageBucket: "midesi-65562.firebasestorage.app",
  messagingSenderId: "1095262983676",
  appId: "1:1095262983676:web:d75c1f036a92c8add74e79",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore & Storage & Auth Initialization
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // Initialize Firebase Auth

const functions = getFunctions();

// ✅ Export everything
export {
  db,
  storage,
  auth,
  functions, // Export this so you can call httpsCallable anywhere
  collection,
  getDocs,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  serverTimestamp,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  httpsCallable, // Export this so you can create callable functions on demand
};

