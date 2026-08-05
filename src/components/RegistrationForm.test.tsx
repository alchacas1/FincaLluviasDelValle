import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RegistrationForm } from './RegistrationForm'
import { getLocalDateInputValue } from '../utils/date'

async function fillBaseFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana')
  await user.type(screen.getByLabelText('Primer apellido'), 'Perez')
  await user.type(screen.getByLabelText('Segundo apellido'), 'Solis')
  await user.type(screen.getByLabelText('Identificación'), '1-2345-6789')
  await user.selectOptions(screen.getByLabelText('Nacionalidad'), 'Costa Rica')

  return user
}

describe('RegistrationForm', () => {
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

  it('uses the primary visitor as group responsible and normalizes one member per line', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.queryByLabelText('Persona encargada')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombres del grupo')).toHaveAttribute('maxLength', '500')

    await fillBaseFields(user)
    await user.type(screen.getByLabelText('Nombres del grupo'), '  Eva  {enter}{enter} Mateo ')
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryMode: 'group',
      firstName: 'Ana',
      firstLastName: 'Perez',
      secondLastName: 'Solis',
      groupMembers: ['Eva', 'Mateo'],
    }))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('responsibleName')
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
