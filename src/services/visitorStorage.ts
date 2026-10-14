import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { MAX_GROUP_MEMBERS } from '../domain/visitorLimits'
import type { GroupMemberEntry, VisitorDraft, VisitorEntry, VisitorType } from '../types/visitor'
import { getFirebaseDb } from './firebase'

export const VISITS_COLLECTION = 'registroVisitas'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVisitorType(value: unknown): value is VisitorType {
  return value === 'adult' || value === 'child'
}

function isGroupMember(value: unknown): value is GroupMemberEntry {
  if (typeof value === 'string') return value.trim().length > 0
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.fullName === 'string'
    && typeof value.identification === 'string'
    && isVisitorType(value.visitorType)
}

function toIsoDate(value: unknown): string | null {
  try {
    if (typeof value === 'string') {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    if (isRecord(value) && typeof value.toDate === 'function') {
      const date = value.toDate()
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null
    }
  } catch {
    return null
  }

  return null
}

function mapRemoteEntry(documentId: string, value: unknown, expectedOwnerUid: string): VisitorEntry | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : documentId
  const createdAt = toIsoDate(value.createdAt)
  const groupMembers = value.groupMembers

  if (
    !id
    || value.ownerUid !== expectedOwnerUid
    || typeof value.firstName !== 'string'
    || typeof value.firstLastName !== 'string'
    || typeof value.secondLastName !== 'string'
    || typeof value.identification !== 'string'
    || typeof value.visitDate !== 'string'
    || typeof value.nationality !== 'string'
    || !isVisitorType(value.visitorType)
    || (value.entryMode !== 'individual' && value.entryMode !== 'group')
    || !Array.isArray(groupMembers)
    || groupMembers.length > MAX_GROUP_MEMBERS
    || !groupMembers.every(isGroupMember)
    || !createdAt
  ) {
    return null
  }

  return {
    id,
    ownerUid: expectedOwnerUid,
    firstName: value.firstName,
    firstLastName: value.firstLastName,
    secondLastName: value.secondLastName,
    identification: value.identification,
    visitDate: value.visitDate,
    nationality: value.nationality,
    visitorType: value.visitorType,
    entryMode: value.entryMode,
    groupMembers,
    createdAt,
  }
}

export const visitorStorage = {
  async list(ownerUid: string): Promise<VisitorEntry[]> {
    try {
      const visitsQuery = query(
        collection(getFirebaseDb(), VISITS_COLLECTION),
        where('ownerUid', '==', ownerUid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(visitsQuery)

      return snapshot.docs.map((entryDoc) => {
        const entry = mapRemoteEntry(entryDoc.id, entryDoc.data(), ownerUid)
        if (!entry) throw new Error('malformed-visitor-record')
        return entry
      })
    } catch {
      throw new Error('No fue posible cargar los ingresos registrados.')
    }
  },

  async create(ownerUid: string, draft: VisitorDraft): Promise<VisitorEntry> {
    const id = crypto.randomUUID()
    const entry: VisitorEntry = {
      ...draft,
      id,
      ownerUid,
      createdAt: new Date().toISOString(),
    }

    try {
      await setDoc(doc(getFirebaseDb(), VISITS_COLLECTION, id), {
        ...draft,
        id,
        ownerUid,
        createdAt: serverTimestamp(),
      })
      return entry
    } catch {
      throw new Error('No fue posible guardar el registro.')
    }
  },
}
