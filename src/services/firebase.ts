import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let firestoreInstance: Firestore | null = null

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0)
}

export function getFirebaseDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase no esta configurado. Revisa las variables VITE_FIREBASE_* en .env.')
  }

  if (firestoreInstance) {
    return firestoreInstance
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  firestoreInstance = getFirestore(app)
  return firestoreInstance
}