import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  observe: vi.fn(),
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  syncProfile: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('../services/auth', () => ({
  authService: {
    observe: mocks.observe,
    loginWithPassword: mocks.loginWithPassword,
    registerWithPassword: mocks.registerWithPassword,
    loginWithGoogle: mocks.loginWithGoogle,
    logout: mocks.logout,
    syncProfile: mocks.syncProfile,
  },
}))

import { AuthProvider, useAuth } from './AuthContext'

let authObserver: ((user: User | null) => void) | undefined

const userA = { uid: 'uid-a', email: 'a@example.com', providerData: [] } as unknown as User
const userB = { uid: 'uid-b', email: 'b@example.com', providerData: [] } as unknown as User

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function AuthProbe() {
  const auth = useAuth()

  return (
    <div>
      <span>{auth.isInitializing ? 'loading' : 'ready'}</span>
      <span>{auth.user?.uid ?? 'no-user'}</span>
      {auth.profileError && <span>{auth.profileError}</span>}
      <button type="button" onClick={() => void auth.retryProfileSync()}>Reintentar</button>
      <button type="button" onClick={() => void auth.logout()}>Salir</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authObserver = undefined
    mocks.observe.mockImplementation((observer: (user: User | null) => void) => {
      authObserver = observer
      return mocks.unsubscribe
    })
    mocks.syncProfile.mockResolvedValue(undefined)
    mocks.logout.mockResolvedValue(undefined)
  })

  it('does not expose the user until the private profile is synchronized', async () => {
    const profile = deferred<void>()
    mocks.syncProfile.mockReturnValue(profile.promise)
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    act(() => authObserver?.(userA))
    expect(screen.getByText('loading')).toBeVisible()
    expect(screen.queryByText('uid-a')).not.toBeInTheDocument()

    await act(async () => profile.resolve())
    expect(screen.getByText('uid-a')).toBeVisible()
  })

  it('ignores a stale profile completion after the auth user changes', async () => {
    const first = deferred<void>()
    mocks.syncProfile
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined)
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    act(() => authObserver?.(userA))
    await act(async () => authObserver?.(userB))
    expect(screen.getByText('uid-b')).toBeVisible()

    await act(async () => first.resolve())
    expect(screen.getByText('uid-b')).toBeVisible()
    expect(screen.queryByText('uid-a')).not.toBeInTheDocument()
  })

  it('keeps the session recoverable when profile synchronization fails', async () => {
    mocks.syncProfile.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await act(async () => authObserver?.(userA))
    expect(screen.getByText('No fue posible preparar tu perfil.')).toBeVisible()

    mocks.syncProfile.mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('uid-a')).toBeVisible()
  })

  it('invalidates pending profile work before signing out', async () => {
    const profile = deferred<void>()
    mocks.syncProfile.mockReturnValue(profile.promise)
    const user = userEvent.setup()
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    act(() => authObserver?.(userA))
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    await act(async () => profile.resolve())

    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(screen.queryByText('uid-a')).not.toBeInTheDocument()
  })

  it('unsubscribes from Firebase Auth when unmounted', () => {
    const { unmount } = render(<AuthProvider><AuthProbe /></AuthProvider>)

    unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })
})
