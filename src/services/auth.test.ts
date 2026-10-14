import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { name: 'auth' },
  database: { name: 'database' },
  userRef: { path: 'usuarios/uid-1' },
  serverTimestampValue: { kind: 'server-timestamp' },
  createUserWithEmailAndPassword: vi.fn(),
  getDoc: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setDoc: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateDoc: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut,
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => mocks.userRef),
  getDoc: mocks.getDoc,
  serverTimestamp: vi.fn(() => mocks.serverTimestampValue),
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
}))

vi.mock('./firebase', () => ({
  getFirebaseAuth: vi.fn(() => mocks.auth),
  getFirebaseDb: vi.fn(() => mocks.database),
}))

import { GoogleAuthProvider } from 'firebase/auth'
import { doc } from 'firebase/firestore'

import { authService } from './auth'

const firebaseUser = {
  uid: 'uid-1',
  email: 'ana@example.com',
  displayName: 'Ana',
  providerData: [{ providerId: 'google.com' }],
} as User

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDoc.mockResolvedValue({ exists: () => false })
  })

  it('uses Firebase email/password and Google providers', async () => {
    await authService.loginWithPassword('ana@example.com', 'secret-123')
    await authService.registerWithPassword('ana@example.com', 'secret-123')
    await authService.loginWithGoogle()

    expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, 'ana@example.com', 'secret-123')
    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, 'ana@example.com', 'secret-123')
    expect(mocks.signInWithPopup).toHaveBeenCalledWith(mocks.auth, expect.any(GoogleAuthProvider))
  })

  it('observes auth changes and signs out through the shared Auth instance', async () => {
    const observer = vi.fn()

    authService.observe(observer)
    await authService.logout()

    expect(mocks.onAuthStateChanged).toHaveBeenCalledWith(mocks.auth, observer)
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth)
  })

  it('creates a new profile with immutable and last-login timestamps', async () => {
    await authService.syncProfile(firebaseUser)

    expect(doc).toHaveBeenCalledWith(mocks.database, 'usuarios', 'uid-1')
    expect(mocks.setDoc).toHaveBeenCalledWith(mocks.userRef, {
      uid: 'uid-1',
      email: 'ana@example.com',
      displayName: 'Ana',
      providers: ['google.com'],
      createdAt: mocks.serverTimestampValue,
      lastLoginAt: mocks.serverTimestampValue,
    })
  })

  it('updates login metadata without overwriting createdAt', async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true })

    await authService.syncProfile(firebaseUser)

    expect(mocks.updateDoc).toHaveBeenCalledWith(mocks.userRef, {
      email: 'ana@example.com',
      displayName: 'Ana',
      providers: ['google.com'],
      lastLoginAt: mocks.serverTimestampValue,
    })
    expect(mocks.setDoc).not.toHaveBeenCalled()
  })

  it('normalizes duplicate provider identifiers', async () => {
    const duplicateProviderUser = {
      ...firebaseUser,
      providerData: [
        { providerId: 'google.com' },
        { providerId: 'google.com' },
        { providerId: 'password' },
      ],
    } as User

    await authService.syncProfile(duplicateProviderUser)

    expect(mocks.setDoc).toHaveBeenCalledWith(
      mocks.userRef,
      expect.objectContaining({ providers: ['google.com', 'password'] }),
    )
  })

  it('rejects an authenticated account without an email', async () => {
    await expect(authService.syncProfile({ ...firebaseUser, email: null } as User))
      .rejects.toThrow('La cuenta autenticada no tiene un correo disponible.')
    expect(mocks.getDoc).not.toHaveBeenCalled()
  })
})
