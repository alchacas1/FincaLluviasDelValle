import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RegistrationForm } from './RegistrationForm'
import { getLocalDateInputValue } from '../utils/date'

async function fillBaseFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez')
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

    expect(await screen.findByText('Ingresa el nombre completo.')).toBeVisible()
    expect(screen.getByText('Ingresa la identificación.')).toBeVisible()
    expect(screen.getByText('Selecciona la nacionalidad.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires group details and normalizes one member per line', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.getByLabelText('Persona encargada')).toBeVisible()
    expect(screen.getByLabelText('Nombres del grupo')).toHaveAttribute('maxLength', '500')

    await fillBaseFields(user)
    await user.type(screen.getByLabelText('Persona encargada'), '  Laura Gómez  ')
    await user.type(screen.getByLabelText('Nombres del grupo'), '  Eva  {enter}{enter} Mateo ')
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryMode: 'group',
      responsibleName: 'Laura Gómez',
      groupMembers: ['Eva', 'Mateo'],
    }))
  })

  it('keeps completed values when saving fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await fillBaseFields(user)
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Pérez')
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
