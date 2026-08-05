import { useEffect, useState } from 'react'

import coffeeBotanical from './assets/coffee-botanical.png'
import { Header, type AppView } from './components/Header'
import { HistoryView } from './components/HistoryView'
import { RecentEntries } from './components/RecentEntries'
import { RegistrationForm } from './components/RegistrationForm'
import { visitorStorage } from './services/visitorStorage'
import type { VisitorDraft, VisitorEntry } from './types/visitor'

export function App() {
  const [entries, setEntries] = useState<VisitorEntry[]>([])
  const [activeView, setActiveView] = useState<AppView>('registration')
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
      setEntries((currentEntries) => [entry, ...currentEntries])
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
    <div className="app-shell">
      <Header activeView={activeView} onNavigate={setActiveView} />
      <div className="botanical-layer" aria-hidden="true">
        <img src={coffeeBotanical} alt="" />
      </div>
      <main id="main-content" className="main-layout">
        {activeView === 'registration' ? (
          <>
            <section id="registration-form" className="panel registration-card" aria-labelledby="registration-heading">
              <div className="section-heading">
                <h1 id="registration-heading">Registro de ingreso</h1>
              </div>
              {successMessage && <p className="status-message" role="status">{successMessage}</p>}
              {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
              <RegistrationForm onSubmit={handleSubmit} isSaving={isSaving} />
            </section>
            <RecentEntries entries={entries} />
          </>
        ) : (
          <HistoryView entries={entries} />
        )}
      </main>
    </div>
  )
}
