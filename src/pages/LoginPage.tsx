import { useState } from 'react'

import brandMark from '../assets/brand-mark.svg'

interface LoginPageProps {
  onEnter: () => void
}

export function LoginPage({ onEnter }: LoginPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEnter = () => {
    setIsSubmitting(true)
    onEnter()
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title">
        <img className="auth-mark" src={brandMark} alt="" aria-hidden="true" />
        <p className="maintenance-eyebrow">Acceso al sistema</p>
        <h1 id="login-title">Login</h1>
        <p>Ingresa para ir al registro de ingreso y al historial.</p>
        <button type="button" className="primary-action" onClick={handleEnter} disabled={isSubmitting}>
          Entrar
        </button>
      </section>
    </main>
  )
}