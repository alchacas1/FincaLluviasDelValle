import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { VisitorEntry } from '../types/visitor'
import { HistoryView } from './HistoryView'

function createEntry(
  id: string,
  firstName: string,
  nationality: string,
  entryMode: VisitorEntry['entryMode'],
  createdAt = '2026-08-05T09:00:00.000-06:00',
): VisitorEntry {
  return {
    id,
    firstName,
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

const entries = [
  createEntry('1', 'Jose', 'Costa Rica', 'individual'),
  createEntry('2', 'Maria', 'Nicaragua', 'group'),
  createEntry('3', 'Carlos', 'Panama', 'individual', '2026-07-15T09:00:00.000-06:00'),
]

describe('HistoryView', () => {
  it('renders all entries with the requested filters', () => {
    render(<HistoryView entries={entries} now={new Date('2026-08-05T12:00:00.000-06:00')} />)

    expect(screen.getByRole('heading', { name: 'Historial' })).toBeVisible()
    expect(screen.getByLabelText('Fecha')).toBeVisible()
    expect(screen.getByLabelText('Nacionalidad')).toBeVisible()
    expect(screen.getByLabelText('Modalidad')).toBeVisible()
    expect(screen.getByLabelText('Buscar')).toBeVisible()
    expect(screen.getByText('Jose Chaves Cascante')).toBeVisible()
    expect(screen.getByText('Maria Chaves Cascante')).toBeVisible()
    expect(screen.getByText('Carlos Chaves Cascante')).toBeVisible()
  })

  it('filters by date range, nationality, entry mode and text search', async () => {
    const user = userEvent.setup()
    render(<HistoryView entries={entries} now={new Date('2026-08-05T12:00:00.000-06:00')} />)

    await user.selectOptions(screen.getByLabelText('Fecha'), 'this-month')
    await user.selectOptions(screen.getByLabelText('Nacionalidad'), 'Nicaragua')
    await user.selectOptions(screen.getByLabelText('Modalidad'), 'group')
    await user.type(screen.getByLabelText('Buscar'), 'alvaro')

    expect(screen.queryByText('Jose Chaves Cascante')).not.toBeInTheDocument()
    expect(screen.getByText('Maria Chaves Cascante')).toBeVisible()
    expect(screen.queryByText('Carlos Chaves Cascante')).not.toBeInTheDocument()
    expect(screen.getByText('Mostrando 1 de 3 registros')).toBeVisible()
  })

  it('clears filters back to all records', async () => {
    const user = userEvent.setup()
    render(<HistoryView entries={entries} now={new Date('2026-08-05T12:00:00.000-06:00')} />)

    await user.selectOptions(screen.getByLabelText('Modalidad'), 'group')
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Fecha')).toHaveValue('all')
    expect(screen.getByLabelText('Nacionalidad')).toHaveValue('all')
    expect(screen.getByLabelText('Modalidad')).toHaveValue('all')
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
    expect(screen.getByText('Mostrando 3 de 3 registros')).toBeVisible()
  })
})
