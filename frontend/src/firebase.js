import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAm5TX5FY7bUbSQkVe98nFzGw6mU4LL5fI",
  authDomain: "orcabet-7cd40.firebaseapp.com",
  projectId: "orcabet-7cd40",
  storageBucket: "orcabet-7cd40.firebasestorage.app",
  messagingSenderId: "958802524863",
  appId: "1:958802524863:web:8901469faba144099de40a",
  measurementId: "G-N2SZG9JQK5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function initAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(app);
}

export default app;
