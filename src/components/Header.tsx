import { Leaf } from 'lucide-react'

export function Header() {
  return (
    <header>
      <a href="#main-content" aria-label="Ir al contenido principal">
        <Leaf aria-hidden="true" />
        <span>Finca Lluvias del Valle</span>
      </a>
      <p>Control de visitantes</p>
      <nav aria-label="Navegación principal">
        <a href="#registration-form" aria-current="page">Registro de ingreso</a>
        <span aria-disabled="true">Historial</span>
        <span aria-disabled="true">Información</span>
      </nav>
    </header>
  )
}
