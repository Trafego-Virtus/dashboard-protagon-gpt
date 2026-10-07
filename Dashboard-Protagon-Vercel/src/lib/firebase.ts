import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPa02bbCjDregOSPygHe4Ci6zR4M0YBaA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cool-wonder-9nn32.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cool-wonder-9nn32",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cool-wonder-9nn32.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "975867112561",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:975867112561:web:8fc202d7a776c94bba7fd0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-dashboardprotago-23d29d1c-5bdc-48c3-a302-306083189b7c");
