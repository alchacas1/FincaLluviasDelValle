import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { VisitorEntry } from '../types/visitor'
import { RecentEntries } from './RecentEntries'

function createEntry(index: number, entryMode: VisitorEntry['entryMode'] = 'individual'): VisitorEntry {
  return {
    id: `visitor-${index}`,
    ownerUid: 'uid-a',
    firstName: 'Visitante',
    firstLastName: `${index}`,
    secondLastName: 'Solis',
    identification: `1-000${index}`,
    visitDate: '2026-08-04',
    nationality: 'Costa Rica',
    visitorType: 'adult',
    entryMode,
    groupMembers: entryMode === 'group' ? ['Eva', 'Mateo'] : [],
    createdAt: `2026-08-04T0${index}:00:00.000Z`,
  }
}

describe('RecentEntries', () => {
  it('shows only the first five received entries', () => {
    const entries = Array.from({ length: 6 }, (_, index) => createEntry(index + 1))

    render(<RecentEntries entries={entries} />)

    expect(screen.getByText('Visitante 1 Solis')).toBeVisible()
    expect(screen.getByText('Visitante 5 Solis')).toBeVisible()
    expect(screen.queryByText('Visitante 6 Solis')).not.toBeInTheDocument()
  })

  it('shows group mode, the primary visitor as responsible and its members', () => {
    render(<RecentEntries entries={[createEntry(1, 'group')]} />)

    expect(screen.getByText('Grupo')).toBeVisible()
    expect(screen.getAllByText('Visitante 1 Solis')).toHaveLength(2)
    expect(screen.getByText('Eva')).toBeVisible()
    expect(screen.getByText('Mateo')).toBeVisible()
  })

  it('shows individual mode without responsible person or group members', () => {
    render(<RecentEntries entries={[createEntry(1)]} />)

    expect(screen.getByText('Individual')).toBeVisible()
    expect(screen.queryByText('Encargado')).not.toBeInTheDocument()
    expect(screen.queryByText('Integrantes')).not.toBeInTheDocument()
  })
})
