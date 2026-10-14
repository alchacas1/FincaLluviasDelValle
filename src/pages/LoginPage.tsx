import { useState, type FormEvent } from 'react'

import brandMark from '../assets/brand-mark.svg'
import { useAuth } from '../auth/AuthContext'

const authMessages: Record<string, string> = {
  'auth/account-exists-with-different-credential': 'Este correo ya usa otro metodo de acceso. Ingresa con ese metodo primero.',
  'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
  'auth/invalid-credential': 'El correo o la contrasena no son correctos.',
  'auth/invalid-email': 'Ingresa un correo valido.',
  'auth/popup-closed-by-user': 'Se cerro la ventana de Google antes de completar el acceso.',
  'auth/too-many-requests': 'Hay demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
}

type PendingAction = 'login' | 'register' | 'google' | null

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''
  return authMessages[code] ?? 'No fue posible completar el acceso. Intenta de nuevo.'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function LoginPage() {
  const { loginWithPassword, registerWithPassword, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)
  const isPending = pendingAction !== null

  const runAction = async (action: Exclude<PendingAction, null>, callback: () => Promise<void>) => {
    setPendingAction(action)
    setError(null)

    try {
      await callback()
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setPendingAction(null)
    }
  }

  const getValidatedEmail = () => {
    const normalizedEmail = normalizeEmail(email)
    if (!isValidEmail(normalizedEmail)) {
      setError(authMessages['auth/invalid-email'])
      return null
    }
    return normalizedEmail
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = getValidatedEmail()
    if (!normalizedEmail) return
    void runAction('login', () => loginWithPassword(normalizedEmail, password))
  }

  const handleRegister = () => {
    const normalizedEmail = getValidatedEmail()
    if (!normalizedEmail) return
    if (password.length < 6) {
      setError(authMessages['auth/weak-password'])
      return
    }
    void runAction('register', () => registerWithPassword(normalizedEmail, password))
  }

  const handleGoogleLogin = () => {
    void runAction('google', loginWithGoogle)
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title" aria-busy={isPending}>
        <img className="auth-mark" src={brandMark} alt="" aria-hidden="true" />
        <p className="maintenance-eyebrow">Acceso al sistema</p>
        <h1 id="login-title">Iniciar sesion</h1>
        <p>Ingresa para registrar visitas y consultar tu historial.</p>

        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <label className="auth-field">
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={isPending}
              required
            />
          </label>

          <label className="auth-field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isPending}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="primary-action" disabled={isPending}>
              Ingresar
            </button>
            <button type="button" className="secondary-button" onClick={handleRegister} disabled={isPending}>
              Crear cuenta
            </button>
          </div>

          <button type="button" className="google-action" onClick={handleGoogleLogin} disabled={isPending}>
            Continuar con Google
          </button>
        </form>
      </section>
    </main>
  )
}
