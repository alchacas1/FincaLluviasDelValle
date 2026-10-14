import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const PROJECT_ID = 'finca-lluvias-del-valle-rules-test'

let testEnv: RulesTestEnvironment

function validMember(index = 0) {
  return {
    id: `member-${index}`,
    fullName: `Integrante ${index}`,
    identification: `ced-${index}`,
    visitorType: 'adult',
  }
}

function validVisit(ownerUid: string, id: string) {
  return {
    id,
    ownerUid,
    firstName: 'Ana',
    firstLastName: 'Perez',
    secondLastName: 'Solis',
    identification: '1-1111-1111',
    visitDate: '2026-10-13',
    nationality: 'Costa Rica',
    visitorType: 'adult',
    entryMode: 'individual',
    groupMembers: [],
    createdAt: serverTimestamp(),
  }
}

function validProfile(uid: string, email: string) {
  return {
    uid,
    email,
    displayName: 'Persona de prueba',
    providers: ['password'],
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  })
}, 30_000)

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'registroVisitas', 'visit-a'), validVisit('user-a', 'visit-a'))
    await setDoc(doc(db, 'registroVisitas', 'visit-b'), validVisit('user-b', 'visit-b'))
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

describe('Firestore security rules', () => {
  it('denies every anonymous read and write', async () => {
    const anonymousDb = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDocs(collection(anonymousDb, 'registroVisitas')))
    await assertFails(getDoc(doc(anonymousDb, 'registroVisitas', 'visit-a')))
    await assertFails(setDoc(
      doc(anonymousDb, 'registroVisitas', 'visit-anonymous'),
      validVisit('user-a', 'visit-anonymous'),
    ))
    await assertFails(getDoc(doc(anonymousDb, 'usuarios', 'user-a')))
    await assertFails(setDoc(
      doc(anonymousDb, 'usuarios', 'user-a'),
      validProfile('user-a', 'a@example.com'),
    ))
  })

  it('allows an owner query and rejects an unconstrained query', async () => {
    const db = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertSucceeds(getDocs(query(
      collection(db, 'registroVisitas'),
      where('ownerUid', '==', 'user-a'),
      orderBy('createdAt', 'desc'),
    )))
    await assertFails(getDocs(query(
      collection(db, 'registroVisitas'),
      orderBy('createdAt', 'desc'),
    )))
  })

  it('allows valid owner creates and reads', async () => {
    const db = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertSucceeds(setDoc(
      doc(db, 'registroVisitas', 'visit-created'),
      validVisit('user-a', 'visit-created'),
    ))
    await assertSucceeds(setDoc(
      doc(db, 'registroVisitas', 'visit-group'),
      {
        ...validVisit('user-a', 'visit-group'),
        entryMode: 'group',
        groupMembers: [validMember()],
      },
    ))
    await assertSucceeds(getDoc(doc(db, 'registroVisitas', 'visit-a')))
  })

  it('rejects cross-user reads and forged ownership or document ids', async () => {
    const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertFails(getDoc(doc(dbA, 'registroVisitas', 'visit-b')))
    await assertFails(setDoc(
      doc(dbA, 'registroVisitas', 'visit-forged'),
      validVisit('user-b', 'visit-forged'),
    ))
    await assertFails(setDoc(
      doc(dbA, 'registroVisitas', 'path-id'),
      validVisit('user-a', 'different-id'),
    ))
  })

  it('allows only an owner profile whose email matches the token', async () => {
    const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertSucceeds(setDoc(
      doc(dbA, 'usuarios', 'user-a'),
      validProfile('user-a', 'a@example.com'),
    ))
    await assertSucceeds(getDoc(doc(dbA, 'usuarios', 'user-a')))
    await assertFails(getDoc(doc(dbA, 'usuarios', 'user-b')))
    await assertFails(getDocs(collection(dbA, 'usuarios')))
    await assertFails(setDoc(
      doc(dbA, 'usuarios', 'user-b'),
      validProfile('user-b', 'a@example.com'),
    ))
    await assertFails(setDoc(
      doc(dbA, 'usuarios', 'user-a'),
      validProfile('user-a', 'spoof@example.com'),
    ))
  })

  it('allows safe profile refreshes but rejects createdAt and schema changes', async () => {
    const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
    const profileRef = doc(dbA, 'usuarios', 'user-a')

    await assertSucceeds(setDoc(profileRef, validProfile('user-a', 'a@example.com')))
    await assertSucceeds(updateDoc(profileRef, { lastLoginAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(profileRef, {
      displayName: 'Nombre actualizado',
      providers: ['password', 'google.com'],
      lastLoginAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(profileRef, { createdAt: serverTimestamp() }))
    await assertFails(updateDoc(profileRef, { role: 'admin' }))
    await assertFails(deleteDoc(profileRef))
  })

  it('rejects schema pollution, invalid members, updates, and deletes', async () => {
    const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'extra'), {
      ...validVisit('user-a', 'extra'),
      extraData: 'blocked',
    }))
    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'large'), {
      ...validVisit('user-a', 'large'),
      entryMode: 'group',
      groupMembers: Array.from({ length: 11 }, (_, index) => validMember(index)),
    }))
    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'bad-member'), {
      ...validVisit('user-a', 'bad-member'),
      entryMode: 'group',
      groupMembers: [{ ...validMember(), role: 'admin' }],
    }))
    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'oversize-name'), {
      ...validVisit('user-a', 'oversize-name'),
      firstName: 'a'.repeat(81),
    }))
    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'empty-group'), {
      ...validVisit('user-a', 'empty-group'),
      entryMode: 'group',
    }))
    await assertFails(setDoc(doc(dbA, 'registroVisitas', 'forged-time'), {
      ...validVisit('user-a', 'forged-time'),
      createdAt: Timestamp.fromDate(new Date('2026-10-13T10:00:00.000Z')),
    }))
    await assertFails(updateDoc(
      doc(dbA, 'registroVisitas', 'visit-a'),
      { nationality: 'Otra' },
    ))
    await assertFails(deleteDoc(doc(dbA, 'registroVisitas', 'visit-a')))
  })

  it('denies unknown collections by default', async () => {
    const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()

    await assertFails(getDoc(doc(dbA, 'otraColeccion', 'documento')))
    await assertFails(setDoc(doc(dbA, 'otraColeccion', 'documento'), { value: true }))
  })
})
