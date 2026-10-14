import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retryProfileSync: vi.fn(),
  logout: vi.fn(),
  auth: {
    user: null as User | null,
    isInitializing: false,
    profileError: null as string | null,
  },
}))

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    ...mocks.auth,
    retryProfileSync: mocks.retryProfileSync,
    logout: mocks.logout,
  }),
}))

import { PublicOnlyRoute, RequireAuth } from './AuthRoute'

function mockAuth(state: Partial<typeof mocks.auth>) {
  Object.assign(mocks.auth, {
    user: null,
    isInitializing: false,
    profileError: null,
    ...state,
  })
}

function renderRoutesAt(path: string, route: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {route}
        <Route path="/login" element={<div>Login destination</div>} />
        <Route path="/registros" element={<div>Records destination</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('authentication route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retryProfileSync.mockResolvedValue(undefined)
    mocks.logout.mockResolvedValue(undefined)
    mockAuth({})
  })

  it('shows a loading state without rendering private children', () => {
    mockAuth({ isInitializing: true, user: null })

    render(<MemoryRouter><RequireAuth><div>Private</div></RequireAuth></MemoryRouter>)

    expect(screen.getByRole('status')).toHaveTextContent('Preparando tu cuenta')
    expect(screen.queryByText('Private')).not.toBeInTheDocument()
  })

  it('redirects a signed-out visitor to login', () => {
    renderRoutesAt(
      '/registros',
      <Route path="/registros" element={<RequireAuth><div>Private</div></RequireAuth>} />,
    )

    expect(screen.getByText('Login destination')).toBeVisible()
  })

  it('offers recovery when profile initialization failed', async () => {
    mockAuth({ profileError: 'No fue posible preparar tu perfil.' })
    const user = userEvent.setup()
    render(<MemoryRouter><RequireAuth><div>Private</div></RequireAuth></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesion' }))

    expect(mocks.retryProfileSync).toHaveBeenCalledOnce()
    expect(mocks.logout).toHaveBeenCalledOnce()
  })

  it('renders private children only for an authenticated user', () => {
    mockAuth({ user: { uid: 'uid-a' } as User })

    render(<MemoryRouter><RequireAuth><div>Private</div></RequireAuth></MemoryRouter>)

    expect(screen.getByText('Private')).toBeVisible()
  })

  it('redirects an authenticated user away from the public login route', () => {
    mockAuth({ user: { uid: 'uid-a' } as User })

    renderRoutesAt(
      '/login',
      <Route path="/login" element={<PublicOnlyRoute><div>Public</div></PublicOnlyRoute>} />,
    )

    expect(screen.getByText('Records destination')).toBeVisible()
  })
})
