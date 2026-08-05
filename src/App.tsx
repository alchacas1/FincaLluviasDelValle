import { useEffect, useState } from 'react'

import { Header } from './components/Header'
import { RecentEntries } from './components/RecentEntries'
import { RegistrationForm } from './components/RegistrationForm'
import { visitorStorage } from './services/visitorStorage'
import type { VisitorDraft, VisitorEntry } from './types/visitor'

export function App() {
  const [entries, setEntries] = useState<VisitorEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    void visitorStorage.list()
      .then((storedEntries) => {
        if (isActive) setEntries(storedEntries)
      })
      .catch(() => {
        if (isActive) setErrorMessage('No fue posible cargar los ingresos registrados.')
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleSubmit = async (draft: VisitorDraft): Promise<boolean> => {
    setIsSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const entry = await visitorStorage.create(draft)
      setEntries((currentEntries) => [entry, ...currentEntries].slice(0, 5))
      setSuccessMessage('Ingreso registrado correctamente.')
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible guardar el registro.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Header />
      <main id="main-content">
        <section id="registration-form" aria-labelledby="registration-heading">
          <h1 id="registration-heading">Registro de ingreso</h1>
          {successMessage && <p role="status">{successMessage}</p>}
          {errorMessage && <p role="alert">{errorMessage}</p>}
          <RegistrationForm onSubmit={handleSubmit} isSaving={isSaving} />
        </section>
        <RecentEntries entries={entries} />
      </main>
    </>
  )
}
