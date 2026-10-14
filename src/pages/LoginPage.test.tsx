import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  loginWithGoogle: vi.fn(),
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    loginWithPassword: mocks.loginWithPassword,
    registerWithPassword: mocks.registerWithPassword,
    loginWithGoogle: mocks.loginWithGoogle,
  }),
}))

import { getAuthErrorMessage, LoginPage } from './LoginPage'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loginWithPassword.mockResolvedValue(undefined)
    mocks.registerWithPassword.mockResolvedValue(undefined)
    mocks.loginWithGoogle.mockResolvedValue(undefined)
  })

  it('signs in with normalized email and the entered password', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo'), '  ANA@Example.com ')
    await user.type(screen.getByLabelText('Contrasena'), 'secret-123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(mocks.loginWithPassword).toHaveBeenCalledWith('ana@example.com', 'secret-123')
  })

  it('creates an account only after local validation passes', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contrasena'), '123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(mocks.registerWithPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('La contrasena debe tener al menos 6 caracteres.')
  })

  it('validates the email before calling Firebase', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo'), 'correo-invalido')
    await user.type(screen.getByLabelText('Contrasena'), 'secret-123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(mocks.loginWithPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo valido.')
  })

  it('starts Google login from its dedicated action', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(mocks.loginWithGoogle).toHaveBeenCalledOnce()
  })

  it('explains provider conflicts without exposing Firebase internals', async () => {
    mocks.loginWithGoogle.mockRejectedValue({ code: 'auth/account-exists-with-different-credential' })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este correo ya usa otro metodo de acceso. Ingresa con ese metodo primero.',
    )
  })

  it.each([
    ['auth/invalid-credential', 'El correo o la contrasena no son correctos.'],
    ['auth/email-already-in-use', 'Ya existe una cuenta con este correo.'],
    ['auth/too-many-requests', 'Hay demasiados intentos. Espera unos minutos e intenta de nuevo.'],
    ['auth/popup-closed-by-user', 'Se cerro la ventana de Google antes de completar el acceso.'],
    ['auth/unknown', 'No fue posible completar el acceso. Intenta de nuevo.'],
  ])('maps %s to a safe message', (code, message) => {
    expect(getAuthErrorMessage({ code })).toBe(message)
  })

  it('disables every authentication action while one is pending', async () => {
    const login = deferred<void>()
    mocks.loginWithPassword.mockReturnValue(login.promise)
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Correo'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contrasena'), 'secret-123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled()

    await act(async () => login.resolve())
  })
})
