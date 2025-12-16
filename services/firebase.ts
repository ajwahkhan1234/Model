import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBnaEyoa86CL1vgID44-jokN23d_HN4v5A",
  authDomain: "mailblast-ai.firebaseapp.com",
  projectId: "mailblast-ai",
  storageBucket: "mailblast-ai.firebasestorage.app",
  messagingSenderId: "706729844432",
  appId: "1:706729844432:web:bb7307b36f6dfb0c48c8d5",
  measurementId: "G-X979Y0XGNR"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

// Initialize Analytics conditionally (safely)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.warn("Firebase Analytics not supported in this environment:", err);
});

export { app, analytics };