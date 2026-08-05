import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { visitorStorage } from './services/visitorStorage'
import type { VisitorEntry } from './types/visitor'

vi.mock('./services/visitorStorage', () => ({
  visitorStorage: {
    list: vi.fn(async () => []),
    create: vi.fn(),
  },
}))

function createEntry(index: number): VisitorEntry {
  return {
    id: `visitor-${index}`,
    firstName: `Visitante`,
    firstLastName: `${index}`,
    secondLastName: 'Solis',
    identification: `1-000${index}`,
    visitDate: '2026-08-04',
    nationality: 'Costa Rica',
    visitorType: 'adult',
    entryMode: 'individual',
    groupMembers: [],
    createdAt: `2026-08-04T0${index}:00:00.000Z`,
  }
}

const savedEntry: VisitorEntry = {
  id: 'saved-visitor',
  firstName: 'Ana',
  firstLastName: 'Perez',
  secondLastName: 'Solis',
  identification: '1-2345-6789',
  visitDate: '2026-08-04',
  nationality: 'Costa Rica',
  visitorType: 'adult',
  entryMode: 'individual',
  groupMembers: [],
  createdAt: '2026-08-04T10:00:00.000Z',
}

async function fillAndSubmitIndividualVisitor() {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Nombre'), savedEntry.firstName)
  await user.type(screen.getByLabelText('Primer apellido'), savedEntry.firstLastName)
  await user.type(screen.getByLabelText('Segundo apellido'), savedEntry.secondLastName)
  await user.type(screen.getByLabelText('Identificación'), savedEntry.identification)
  await user.selectOptions(screen.getByLabelText('Nacionalidad'), savedEntry.nationality)
  await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(visitorStorage.list).mockResolvedValue([])
  })

  it('saves a valid visitor, refreshes recent entries and announces success', async () => {
    vi.mocked(visitorStorage.create).mockResolvedValue(savedEntry)

    render(<App />)
    await fillAndSubmitIndividualVisitor()

    expect(visitorStorage.create).toHaveBeenCalledOnce()
    expect(await screen.findByText('Ingreso registrado correctamente.')).toBeVisible()
    expect(screen.getByText('Ana Perez Solis')).toBeVisible()
  })

  it('announces a storage failure without adding the visitor', async () => {
    vi.mocked(visitorStorage.create).mockRejectedValue(new Error('No fue posible guardar el registro.'))

    render(<App />)
    await fillAndSubmitIndividualVisitor()

    expect(await screen.findByText('No fue posible guardar el registro.')).toBeVisible()
    expect(screen.queryByText('Ingreso registrado correctamente.')).not.toBeInTheDocument()
  })

  it('navigates to history and shows all stored records', async () => {
    const user = userEvent.setup()
    vi.mocked(visitorStorage.list).mockResolvedValue(Array.from({ length: 6 }, (_, index) => createEntry(index + 1)))

    render(<App />)

    await waitFor(() => expect(visitorStorage.list).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Registro de ingreso' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Visitante 6 Solis')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Historial' }))

    expect(screen.getByRole('heading', { name: 'Historial' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Historial' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Visitante 6 Solis')).toBeVisible()
    expect(screen.getByText('Mostrando 6 de 6 registros')).toBeVisible()
  })

  it('keeps information disabled in the navigation', async () => {
    render(<App />)

    await waitFor(() => expect(visitorStorage.list).toHaveBeenCalledOnce())

    expect(screen.getByText('Información')).toHaveAttribute('aria-disabled', 'true')
  })
})
