import { fireEvent, render, screen } from '@testing-library/react'
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

  it('uses the primary visitor as group responsible and saves numbered lines as clean names', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.queryByLabelText('Persona encargada')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombres del grupo')).toHaveAttribute('maxLength', '500')

    await fillBaseFields(user)
    fireEvent.change(screen.getByLabelText('Nombres del grupo'), {
      target: { value: '1. Eva\n2. Mateo' },
    })
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

  it('allows group members to include an identification after the name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.getByText('Formato recomendado: nombre apellido1 apellido2 - cédula.')).toBeVisible()

    await fillBaseFields(user)
    fireEvent.change(screen.getByLabelText('Nombres del grupo'), {
      target: {
        value: [
          '1. alvaro chaves cascante - 117910947',
          '2. josue jauna pere - 12513615',
        ].join('\n'),
      },
    })
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryMode: 'group',
      groupMembers: [
        'alvaro chaves cascante - 117910947',
        'josue jauna pere - 12513615',
      ],
    }))
  })

  it('numbers group member lines inside the textarea after line breaks are entered', async () => {
    render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(true)} isSaving={false} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: 'Grupo' }))

    expect(screen.getByText('Agrega cada integrante en una línea distinta. Presiona Enter después de cada nombre para verlo en la lista.')).toBeVisible()

    const membersInput = screen.getByLabelText('Nombres del grupo')

    fireEvent.change(membersInput, {
      target: { value: 'alvaro chaves cascante\n' },
    })

    expect(membersInput).toHaveValue('1. alvaro chaves cascante\n2. ')

    fireEvent.change(membersInput, {
      target: { value: '1. alvaro chaves cascante\n2. juanito mora perez\n3. alejandro perez sandoval' },
    })

    expect(membersInput).toHaveValue([
      '1. alvaro chaves cascante',
      '2. juanito mora perez',
      '3. alejandro perez sandoval',
    ].join('\n'))
    expect(screen.queryByRole('list', { name: 'Integrantes agregados' })).not.toBeInTheDocument()
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
