import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from './AuthContext'

interface AuthRouteProps {
  children: ReactNode
}

function AccountLoading() {
  return (
    <main className="maintenance-screen">
      <section className="maintenance-card" role="status" aria-live="polite">
        <p className="maintenance-eyebrow">Finca Lluvias del Valle</p>
        <h1>Preparando tu cuenta</h1>
        <p>Estamos verificando tu sesion.</p>
      </section>
    </main>
  )
}

export function RequireAuth({ children }: AuthRouteProps) {
  const { user, isInitializing, profileError, retryProfileSync, logout } = useAuth()

  if (isInitializing) return <AccountLoading />

  if (profileError) {
    return (
      <main className="maintenance-screen">
        <section className="maintenance-card" aria-labelledby="profile-error-title">
          <p className="maintenance-eyebrow">Acceso al sistema</p>
          <h1 id="profile-error-title">No pudimos preparar tu cuenta</h1>
          <p role="alert">{profileError}</p>
          <div className="auth-actions">
            <button type="button" className="primary-action" onClick={() => void retryProfileSync()}>
              Reintentar
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void logout().catch(() => undefined)}
            >
              Cerrar sesion
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

export function PublicOnlyRoute({ children }: AuthRouteProps) {
  const { user, isInitializing } = useAuth()

  if (isInitializing) return <AccountLoading />
  if (user) return <Navigate to="/registros" replace />

  return children
}
