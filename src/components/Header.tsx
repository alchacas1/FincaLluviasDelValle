import brandMark from '../assets/brand-mark.svg'

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <a className="brand" href="#main-content" aria-label="Ir al contenido principal">
            <img src={brandMark} alt="" aria-hidden="true" />
          </a>
          <span className="brand-copy">
            <strong>Finca Lluvias del Valle</strong>
            <span>Control de visitantes</span>
          </span>
        </div>
        <nav aria-label="Navegación principal">
          <a href="#registration-form" aria-current="page">Registro de ingreso</a>
          <span aria-disabled="true">Historial</span>
          <span aria-disabled="true">Información</span>
        </nav>
      </div>
    </header>
  )
}
