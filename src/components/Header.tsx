import brandMark from '../assets/brand-mark.svg'

export type AppView = 'registration' | 'history'

interface HeaderProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function Header({ activeView, onNavigate }: HeaderProps) {
  return (
    <header className="bg-[var(--forest-950)] text-[var(--cream-50)]">
      <div className="mx-auto w-full max-w-[1280px] flex items-center justify-between gap-8 px-6 py-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            className="inline-flex items-center p-0 border-0 bg-transparent"
            type="button"
            onClick={() => onNavigate('registration')}
            aria-label="Ir al contenido principal"
          >
            <img src={brandMark} alt="" aria-hidden="true" />
          </button>

          <span className="grid gap-0 leading-none min-w-0">
            <strong className="font-serif text-xl md:text-2xl font-semibold truncate">Finca Lluvias del Valle</strong>
            <span className="text-[rgba(255,253,247,0.72)] text-xs tracking-wider uppercase font-semibold">Control de visitantes</span>
          </span>
        </div>

        <nav aria-label="Navegación principal" className="flex items-center gap-2 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onNavigate('registration')}
            aria-current={activeView === 'registration' ? 'page' : undefined}
            className={`px-3 py-2 rounded-full ${activeView === 'registration' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-transparent'}`}
          >
            Registro de ingreso
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            aria-current={activeView === 'history' ? 'page' : undefined}
            className={`px-3 py-2 rounded-full ${activeView === 'history' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-transparent'}`}
          >
            Historial
          </button>
          <span aria-disabled="true" className="px-3 py-2 rounded-full text-[rgba(255,253,247,0.48)]">Información</span>
        </nav>
      </div>
    </header>
  )
}
