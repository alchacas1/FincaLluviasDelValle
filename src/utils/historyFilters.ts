import type { EntryMode, VisitorEntry } from '../types/visitor'
import { formatGroupMember, getGroupMemberIdentification, getGroupMemberName, getGroupMemberTypeLabel } from './groupMembers'

export type HistoryDateRange =
  | 'all'
  | 'day'
  | 'this-week'
  | 'previous-week'
  | 'this-month'
  | 'previous-month'
  | 'this-year'

export interface HistoryFilters {
  dateRange: HistoryDateRange
  nationality: string
  entryMode: EntryMode | 'all'
  search: string
}

export function getVisitorFullName(entry: VisitorEntry): string {
  const separatedName = [entry.firstName, entry.firstLastName, entry.secondLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')

  return separatedName || entry.name || 'Visitante sin nombre'
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  return addDays(startOfDay(date), -daysFromMonday)
}

function getDateRangeBounds(dateRange: HistoryDateRange, now: Date): { start: Date; end: Date } | null {
  const today = startOfDay(now)

  if (dateRange === 'all') return null
  if (dateRange === 'day') return { start: today, end: addDays(today, 1) }
  if (dateRange === 'this-week') {
    const start = startOfWeek(now)
    return { start, end: addDays(start, 7) }
  }
  if (dateRange === 'previous-week') {
    const thisWeekStart = startOfWeek(now)
    return { start: addDays(thisWeekStart, -7), end: thisWeekStart }
  }
  if (dateRange === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
  }
  if (dateRange === 'previous-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start, end: new Date(now.getFullYear(), now.getMonth(), 1) }
  }

  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear() + 1, 0, 1),
  }
}

function entryMatchesDateRange(entry: VisitorEntry, dateRange: HistoryDateRange, now: Date): boolean {
  const bounds = getDateRangeBounds(dateRange, now)
  if (!bounds) return true

  const entryDate = new Date(entry.createdAt)
  return entryDate >= bounds.start && entryDate < bounds.end
}

function entryMatchesSearch(entry: VisitorEntry, search: string): boolean {
  const normalizedSearch = search.trim().toLocaleLowerCase('es-CR')
  if (!normalizedSearch) return true

  const searchableText = [
    getVisitorFullName(entry),
    entry.identification,
    entry.nationality,
    ...entry.groupMembers.flatMap((member) => [
      formatGroupMember(member),
      getGroupMemberName(member),
      getGroupMemberIdentification(member),
      getGroupMemberTypeLabel(member),
    ]),
  ].join(' ').toLocaleLowerCase('es-CR')

  return searchableText.includes(normalizedSearch)
}

export function filterHistoryEntries(entries: VisitorEntry[], filters: HistoryFilters, now = new Date()): VisitorEntry[] {
  return entries.filter((entry) => {
    if (!entryMatchesDateRange(entry, filters.dateRange, now)) return false
    if (filters.nationality !== 'all' && entry.nationality !== filters.nationality) return false
    if (filters.entryMode !== 'all' && entry.entryMode !== filters.entryMode) return false
    return entryMatchesSearch(entry, filters.search)
  })
}

export function getAvailableNationalities(entries: VisitorEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => entry.nationality).filter(Boolean))).sort((first, second) => (
    first.localeCompare(second, 'es-CR')
  ))
}
