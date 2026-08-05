import type { VisitorDraft, VisitorEntry } from '../types/visitor'

export const STORAGE_KEY = 'finca-lluvias:visitors:v1'

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

export const visitorStorage = {
  async list(): Promise<VisitorEntry[]> {
    return sortNewestFirst(readEntries())
  },

  async create(draft: VisitorDraft): Promise<VisitorEntry> {
    const entry: VisitorEntry = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const entries = sortNewestFirst([...readEntries(), entry])

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      throw new Error('No fue posible guardar el registro.')
    }

    return entry
  },
}
