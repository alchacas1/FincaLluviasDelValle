import { describe, expect, it } from 'vitest'

import type { VisitorEntry } from '../types/visitor'
import { filterHistoryEntries, getAvailableNationalities } from './historyFilters'

function createEntry(
  id: string,
  createdAt: string,
  entryMode: VisitorEntry['entryMode'] = 'individual',
  nationality = 'Costa Rica',
): VisitorEntry {
  return {
    id,
    firstName: id,
    firstLastName: 'Chaves',
    secondLastName: 'Cascante',
    identification: `ced-${id}`,
    visitDate: createdAt.slice(0, 10),
    nationality,
    visitorType: 'adult',
    entryMode,
    groupMembers: entryMode === 'group' ? ['Alvaro Chaves Cascante', 'Juanito Mora Perez'] : [],
    createdAt,
  }
}

const now = new Date('2026-08-05T12:00:00.000-06:00')

const entries: VisitorEntry[] = [
  createEntry('today', '2026-08-05T09:00:00.000-06:00'),
  createEntry('this-week', '2026-08-03T09:00:00.000-06:00'),
  createEntry('previous-week', '2026-08-02T09:00:00.000-06:00'),
  createEntry('this-month', '2026-08-01T09:00:00.000-06:00', 'group', 'Nicaragua'),
  createEntry('previous-month', '2026-07-15T09:00:00.000-06:00', 'group', 'Panama'),
  createEntry('this-year', '2026-01-02T09:00:00.000-06:00'),
  createEntry('previous-year', '2025-12-31T09:00:00.000-06:00'),
]

describe('historyFilters', () => {
  it('filters entries by date ranges relative to a reference date', () => {
    expect(filterHistoryEntries(entries, { dateRange: 'day', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['today'])
    expect(filterHistoryEntries(entries, { dateRange: 'this-week', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['today', 'this-week'])
    expect(filterHistoryEntries(entries, { dateRange: 'previous-week', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['previous-week', 'this-month'])
    expect(filterHistoryEntries(entries, { dateRange: 'this-month', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['today', 'this-week', 'previous-week', 'this-month'])
    expect(filterHistoryEntries(entries, { dateRange: 'previous-month', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['previous-month'])
    expect(filterHistoryEntries(entries, { dateRange: 'this-year', nationality: 'all', entryMode: 'all', search: '' }, now).map((entry) => entry.id)).toEqual(['today', 'this-week', 'previous-week', 'this-month', 'previous-month', 'this-year'])
  })

  it('combines nationality, entry mode and text search filters', () => {
    const result = filterHistoryEntries(entries, {
      dateRange: 'all',
      nationality: 'Nicaragua',
      entryMode: 'group',
      search: 'alvaro',
    }, now)

    expect(result.map((entry) => entry.id)).toEqual(['this-month'])
  })

  it('returns sorted nationalities from existing entries', () => {
    expect(getAvailableNationalities(entries)).toEqual(['Costa Rica', 'Nicaragua', 'Panama'])
  })
})
