import type { VisitorDraft, VisitorEntry } from '../types/visitor'
import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'

import { getFirebaseDb, isFirebaseConfigured } from './firebase'

export const STORAGE_KEY = 'finca-lluvias:visitors:v1'
export const VISITS_COLLECTION = 'registroVisitas'

function readEntries(): VisitorEntry[] {
  try {
    const storedEntries = localStorage.getItem(STORAGE_KEY)

    if (storedEntries === null) {
      return []
    }

    const entries: unknown = JSON.parse(storedEntries)
    return Array.isArray(entries) ? (entries as VisitorEntry[]) : []
  } catch {
    return []
  }
}

function sortNewestFirst(entries: VisitorEntry[]): VisitorEntry[] {
  return [...entries].sort((first, second) => second.createdAt.localeCompare(first.createdAt))
}

function persistLocal(entries: VisitorEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const visitorStorage = {
  async list(): Promise<VisitorEntry[]> {
    const localEntries = sortNewestFirst(readEntries())

    if (!isFirebaseConfigured()) {
      return localEntries
    }

    try {
      const database = getFirebaseDb()
      const visitsRef = collection(database, VISITS_COLLECTION)
      const visitsQuery = query(visitsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(visitsQuery)
      const remoteEntries = snapshot.docs
        .map((entryDoc) => {
          const data = entryDoc.data() as Partial<VisitorEntry>

          return {
            ...data,
            id: typeof data.id === 'string' && data.id.length > 0 ? data.id : entryDoc.id,
          } as VisitorEntry
        })
        .filter((entry) => typeof entry.createdAt === 'string' && entry.createdAt.length > 0)

      const entries = sortNewestFirst(remoteEntries)

      try {
        persistLocal(entries)
      } catch {
        // Remote data already loaded; ignore local cache failures.
      }

      return entries
    } catch {
      return localEntries
    }
  },

  async create(draft: VisitorDraft): Promise<VisitorEntry> {
    const entry: VisitorEntry = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const entries = sortNewestFirst([...readEntries(), entry])

    if (isFirebaseConfigured()) {
      try {
        const database = getFirebaseDb()
        await setDoc(doc(database, VISITS_COLLECTION, entry.id), entry)
      } catch {
        throw new Error('No fue posible guardar el registro.')
      }
    }

    try {
      persistLocal(entries)
    } catch {
      if (!isFirebaseConfigured()) {
        throw new Error('No fue posible guardar el registro.')
      }
    }

    return entry
  },
}
