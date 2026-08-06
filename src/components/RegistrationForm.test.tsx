import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useToast from '../hooks/useToast'
import { getLocalDateInputValue } from '../utils/date'
import { RegistrationForm } from './RegistrationForm'

const showToast = vi.fn()

vi.mock('../hooks/useToast', () => ({
  default: vi.fn(() => ({
    showToast,
  })),
}))

async function fillBaseFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana')
  await user.type(screen.getByLabelText('Primer apellido'), 'Perez')
  await user.type(screen.getByLabelText('Segundo apellido'), 'Solis')
  await user.type(screen.getByLabelText('Identificación'), '1-2345-6789')
  await user.selectOptions(screen.getByLabelText('Nacionalidad'), 'Costa Rica')

  return user
}

describe('RegistrationForm', () => {
  const mockedUseToast = vi.mocked(useToast)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseToast.mockReturnValue({ showToast })
  })

  it('starts as adult, individual and today', () => {
    render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(true)} isSaving={false} />)

    expect(screen.getByRole('radio', { name: 'Adulto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Individual' })).toBeChecked()
    expect(screen.getByLabelText('Fecha')).toHaveValue(getLocalDateInputValue())
  })

  it('shows base validation errors without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(false)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)

    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(await screen.findByText('Ingresa el nombre.')).toBeVisible()
    expect(screen.getByText('Ingresa el primer apellido.')).toBeVisible()
    expect(screen.getByText('Ingresa el segundo apellido.')).toBeVisible()
    expect(screen.getByText('Ingresa la identificación.')).toBeVisible()
    expect(screen.getByText('Selecciona la nacionalidad.')).toBeVisible()
    expect(showToast.mock.calls).toEqual([
      ['Ingresa el nombre.', 'warning'],
      ['Ingresa el primer apellido.', 'warning'],
      ['Ingresa el segundo apellido.', 'warning'],
      ['Ingresa la identificación.', 'warning'],
      ['Selecciona la nacionalidad.', 'warning'],
    ])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits separated name fields for individual visitors', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await fillBaseFields(user)
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Ana',
      firstLastName: 'Perez',
      secondLastName: 'Solis',
      entryMode: 'individual',
      groupMembers: [],
    }))
  })

  it('uses the primary visitor as group responsible and saves added members as structured data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.queryByLabelText('Persona encargada')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Integrantes del grupo' })).toBeVisible()

    await fillBaseFields(user)
    await user.type(screen.getByLabelText('Nombre completo'), 'Maria Fernanda Lopez Perez')
    await user.type(screen.getByLabelText('Cédula del integrante'), '1234567890')
    await user.click(within(screen.getByRole('group', { name: 'Adulto / Niño' })).getByRole('radio', { name: 'Niño' }))
    await user.click(screen.getByRole('button', { name: 'Agregar integrante' }))
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryMode: 'group',
      firstName: 'Ana',
      firstLastName: 'Perez',
      secondLastName: 'Solis',
      groupMembers: [
        expect.objectContaining({
          fullName: 'Maria Fernanda Lopez Perez',
          identification: '1234567890',
          visitorType: 'child',
        }),
      ],
    }))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('responsibleName')
  })

  it('adds and removes group members from the visible list', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.getByText('Agrega cada integrante en una línea. Presiona “Agregar” para incluirlo en la lista.')).toBeVisible()
    expect(screen.getByText('Formato recomendado: nombre completo – cédula.')).toBeVisible()

    await user.type(screen.getByLabelText('Nombre completo'), 'Maria Fernanda Lopez Perez')
    await user.type(screen.getByLabelText('Cédula del integrante'), '1234567890')
    await user.click(within(screen.getByRole('group', { name: 'Adulto / Niño' })).getByRole('radio', { name: 'Niño' }))
    await user.click(screen.getByRole('button', { name: 'Agregar integrante' }))

    expect(screen.getByRole('heading', { name: 'Integrantes agregados (1)' })).toBeVisible()
    expect(screen.getByText('Maria Fernanda Lopez Perez')).toBeVisible()
    expect(screen.getByText('1234567890')).toBeVisible()
    expect(screen.getAllByText('Niño').some((element) => element.classList.contains('member-type-badge'))).toBe(true)
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('')
    expect(screen.getByLabelText('Cédula del integrante')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Eliminar integrante Maria Fernanda Lopez Perez' }))

    expect(screen.getByRole('heading', { name: 'Integrantes agregados (0)' })).toBeVisible()
    expect(screen.queryByText('Maria Fernanda Lopez Perez')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires at least one group member before submitting a group entry', async () => {
    render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(true)} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))
    await fillBaseFields(user)
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect((await screen.findAllByText('Agrega al menos un integrante del grupo.'))[0]).toBeVisible()
    expect(showToast.mock.calls).toContainEqual(['Agrega al menos un integrante del grupo.', 'warning'])
  })

  it('warns when trying to add an incomplete group member', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(true)} isSaving={false} />)

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))
    await user.click(screen.getByRole('button', { name: 'Agregar integrante' }))

    expect(screen.getByText('Ingresa el nombre completo y la cédula del integrante.')).toBeVisible()
    expect(showToast).toHaveBeenCalledWith('Ingresa el nombre completo y la cédula del integrante.', 'warning')
  })

  it('keeps completed values when saving fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await fillBaseFields(user)
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
  })

  it('clears the form without calling onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)

    await user.type(screen.getByLabelText('Nombre'), 'Texto temporal')
    await user.click(screen.getByRole('button', { name: 'Limpiar formulario' }))

    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
