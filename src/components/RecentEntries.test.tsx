import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { VisitorEntry } from '../types/visitor'
import { RecentEntries } from './RecentEntries'

function createEntry(index: number, entryMode: VisitorEntry['entryMode'] = 'individual'): VisitorEntry {
  return {
    id: `visitor-${index}`,
    name: `Visitante ${index}`,
    identification: `1-000${index}`,
    visitDate: '2026-08-04',
    nationality: 'Costa Rica',
    visitorType: 'adult',
    entryMode,
    responsibleName: entryMode === 'group' ? 'Laura Gómez' : undefined,
    groupMembers: entryMode === 'group' ? ['Eva', 'Mateo'] : [],
    createdAt: `2026-08-04T0${index}:00:00.000Z`,
  }
}

describe('RecentEntries', () => {
  it('shows only the first five received entries', () => {
    const entries = Array.from({ length: 6 }, (_, index) => createEntry(index + 1))

    render(<RecentEntries entries={entries} />)

    expect(screen.getByText('Visitante 1')).toBeVisible()
    expect(screen.getByText('Visitante 5')).toBeVisible()
    expect(screen.queryByText('Visitante 6')).not.toBeInTheDocument()
  })

  it('shows group mode and its responsible person', () => {
    render(<RecentEntries entries={[createEntry(1, 'group')]} />)

    expect(screen.getByText('Grupo')).toBeVisible()
    expect(screen.getByText('Laura Gómez')).toBeVisible()
  })

  it('shows individual mode and a dash when it has no responsible person', () => {
    render(<RecentEntries entries={[createEntry(1)]} />)

    expect(screen.getByText('Individual')).toBeVisible()
    expect(screen.getByText('—')).toBeVisible()
  })
})
