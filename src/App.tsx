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
    <div className="relative min-h-screen bg-[var(--cream-100)]">
      <Header activeView={activeView} onNavigate={setActiveView} />
      <div className="pointer-events-none fixed inset-28 -z-10 opacity-30">
        <img src={coffeeBotanical} alt="" className="w-full h-full object-cover" />
      </div>
      <main id="main-content" className="mx-auto w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-[1.65fr_1fr] gap-7 px-6 py-12">
        {activeView === 'registration' ? (
          <>
            <section id="registration-form" className="card" aria-labelledby="registration-heading">
              <div className="mb-4">
                <h1 id="registration-heading" className="section-title">Registro de ingreso</h1>
              </div>
              {successMessage && <p className="p-3 rounded-md bg-[rgba(40,96,68,0.09)] text-[var(--forest-800)]" role="status">{successMessage}</p>}
              {errorMessage && <p className="p-3 rounded-md bg-[rgba(167,77,58,0.08)] text-[var(--terracotta-600)]" role="alert">{errorMessage}</p>}
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
