import { useEffect, useState } from 'react'

import coffeeBotanical from './assets/coffee-botanical.png'
import { Header, type AppView } from './components/Header'
import { HistoryView } from './components/HistoryView'
import { RecentEntries } from './components/RecentEntries'
import { RegistrationForm } from './components/RegistrationForm'
import useToast from './hooks/useToast'
import { visitorStorage } from './services/visitorStorage'
import type { VisitorDraft, VisitorEntry } from './types/visitor'

interface AppProps {
  onExit?: () => void
}

export function App({ onExit }: AppProps = {}) {
  const [entries, setEntries] = useState<VisitorEntry[]>([])
  const [activeView, setActiveView] = useState<AppView>('registration')
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    let isActive = true

    void visitorStorage.list()
      .then((storedEntries) => {
        if (isActive) setEntries(storedEntries)
      })
      .catch(() => {
        if (isActive) showToast('No fue posible cargar los ingresos registrados.', 'error')
      })

    return () => {
      isActive = false
    }
  }, [showToast])

  const handleSubmit = async (draft: VisitorDraft): Promise<boolean> => {
    setIsSaving(true)

    try {
      const entry = await visitorStorage.create(draft)
      setEntries((currentEntries) => [entry, ...currentEntries])
      showToast('Ingreso registrado correctamente.', 'success')
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No fue posible guardar el registro.', 'error')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <Header activeView={activeView} onNavigate={setActiveView} onExit={onExit} />
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
