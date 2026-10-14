import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type NextOrObserver,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

import { getFirebaseAuth, getFirebaseDb } from './firebase'

const USERS_COLLECTION = 'usuarios'

function profileData(user: User) {
  const providers = [...new Set(user.providerData.map(({ providerId }) => providerId))]
    .filter((providerId) => providerId === 'password' || providerId === 'google.com')
    .sort()

  return {
    email: user.email ?? '',
    ...(user.displayName ? { displayName: user.displayName } : {}),
    providers,
  }
}

export const authService = {
  observe(callback: NextOrObserver<User>) {
    return onAuthStateChanged(getFirebaseAuth(), callback)
  },

  loginWithPassword(email: string, password: string) {
    return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
  },

  registerWithPassword(email: string, password: string) {
    return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
  },

  loginWithGoogle() {
    return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
  },

  logout() {
    return signOut(getFirebaseAuth())
  },

  async syncProfile(user: User): Promise<void> {
    if (!user.email) {
      throw new Error('La cuenta autenticada no tiene un correo disponible.')
    }

    const userRef = doc(getFirebaseDb(), USERS_COLLECTION, user.uid)
    const snapshot = await getDoc(userRef)
    const currentProfile = profileData(user)

    if (snapshot.exists()) {
      await updateDoc(userRef, {
        ...currentProfile,
        lastLoginAt: serverTimestamp(),
      })
      return
    }

    const timestamp = serverTimestamp()
    await setDoc(userRef, {
      uid: user.uid,
      ...currentProfile,
      createdAt: timestamp,
      lastLoginAt: timestamp,
    })
  },
}
