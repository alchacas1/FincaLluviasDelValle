import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./auth/AuthRoute', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
  PublicOnlyRoute: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('./auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'uid-a' }, logout: vi.fn() }),
}))

vi.mock('./App', () => ({
  App: ({ ownerUid }: { ownerUid: string }) => (
    <>
      <div>Records page</div>
      <div>{`Owner ${ownerUid}`}</div>
    </>
  ),
}))

vi.mock('./pages/LoginPage', () => ({
  LoginPage: () => <div>Login page</div>,
}))

import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it.each(['/', '/home', '/unknown'])('redirects %s to the protected records route', (path) => {
    renderAt(path)

    expect(screen.getByText('Records page')).toBeVisible()
  })

  it('keeps login as the only public destination', () => {
    renderAt('/login')

    expect(screen.getByText('Login page')).toBeVisible()
  })

  it('supplies the authenticated user to the records application', () => {
    renderAt('/registros')

    expect(screen.getByText('Owner uid-a')).toBeVisible()
  })
})
