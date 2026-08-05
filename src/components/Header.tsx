import brandMark from '../assets/brand-mark.svg'

export type AppView = 'registration' | 'history'

interface HeaderProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function Header({ activeView, onNavigate }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <button className="brand" type="button" onClick={() => onNavigate('registration')} aria-label="Ir al contenido principal">
            <img src={brandMark} alt="" aria-hidden="true" />
          </button>
          <span className="brand-copy">
            <strong>Finca Lluvias del Valle</strong>
            <span>Control de visitantes</span>
          </span>
        </div>
        <nav aria-label="Navegación principal">
          <button
            type="button"
            onClick={() => onNavigate('registration')}
            aria-current={activeView === 'registration' ? 'page' : undefined}
          >
            Registro de ingreso
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            aria-current={activeView === 'history' ? 'page' : undefined}
          >
            Historial
          </button>
          <span aria-disabled="true">Información</span>
        </nav>
      </div>
    </header>
  )
}
