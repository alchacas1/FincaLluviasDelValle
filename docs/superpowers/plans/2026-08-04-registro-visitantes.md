# Visitor Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una SPA responsive de registro de visitantes para Finca Lluvias del Valle, fiel a la referencia visual y con persistencia reemplazable basada inicialmente en `localStorage`.

**Architecture:** React compondrá una sola pantalla mediante `Header`, `RegistrationForm` y `RecentEntries`. El dominio vivirá en tipos y funciones puras; `visitorStorage` será la única pieza que conoce `localStorage`, permitiendo reemplazarla posteriormente por Firebase sin cambiar la UI.

**Tech Stack:** Vite, React, TypeScript, npm, Vitest, React Testing Library, user-event, Lucide React, CSS modular por responsabilidad y recursos gráficos locales.

## Global Constraints

- Node disponible: `v22.20.0`; npm disponible: `10.9.3`.
- La primera versión solo implementa Registro de ingreso; Historial e Información se muestran inactivos.
- No se añade React Router ni un gestor de estado global.
- Los componentes nunca acceden directamente a `localStorage`.
- La clave persistida es versionada y los fallos de lectura producen una lista vacía.
- Un fallo de escritura no puede mostrar éxito ni agregar el registro a la lista visible.
- Adulto e Individual son los valores iniciales; la fecha inicial es el día local actual.
- Grupo exige persona encargada y al menos un nombre de integrante; el texto de integrantes admite como máximo 500 caracteres.
- La lista visible contiene como máximo los cinco registros más recientes.
- La aplicación debe ser operable con teclado, anunciar mensajes y evitar desbordes en móvil.

---

### Task 1: Base Vite, modelo de dominio y almacenamiento

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `src/vite-env.d.ts`
- Create: `src/types/visitor.ts`
- Create: `src/services/visitorStorage.ts`
- Create: `src/services/visitorStorage.test.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `VisitorEntry`, `VisitorDraft`, `VisitorType`, `EntryMode`.
- Produces: `visitorStorage.list(): Promise<VisitorEntry[]>` and `visitorStorage.create(draft: VisitorDraft): Promise<VisitorEntry>`.

- [ ] **Step 1: Crear la configuración mínima del proyecto y las dependencias**

Usar scripts `dev`, `build`, `lint`, `test`, `test:run` y `preview`. Instalar React/Vite/TypeScript, `lucide-react`, fuentes locales, Vitest, jsdom y Testing Library. Configurar Vitest con `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, globals y restauración automática de mocks.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Escribir pruebas fallidas del almacenamiento**

Crear `src/services/visitorStorage.test.ts` con estos casos concretos:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, visitorStorage } from './visitorStorage'

const draft = {
  name: 'Ana Solís',
  identification: '1-1111-1111',
  visitDate: '2026-08-04',
  nationality: 'Costa Rica',
  visitorType: 'adult' as const,
  entryMode: 'individual' as const,
  groupMembers: [],
}

describe('visitorStorage', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty list when storage is missing or invalid', async () => {
    await expect(visitorStorage.list()).resolves.toEqual([])
    localStorage.setItem(STORAGE_KEY, '{invalid')
    await expect(visitorStorage.list()).resolves.toEqual([])
  })

  it('creates, persists and returns entries newest first', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('first').mockReturnValueOnce('second')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T10:00:00.000Z'))
    await visitorStorage.create(draft)
    vi.setSystemTime(new Date('2026-08-04T11:00:00.000Z'))
    await visitorStorage.create({ ...draft, name: 'Luis Mora' })
    await expect(visitorStorage.list()).resolves.toEqual([
      expect.objectContaining({ id: 'second' }),
      expect.objectContaining({ id: 'first' }),
    ])
    vi.useRealTimers()
  })

  it('throws when the browser rejects a write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    await expect(visitorStorage.create(draft)).rejects.toThrow('No fue posible guardar el registro.')
  })
})
```

- [ ] **Step 3: Ejecutar la prueba y confirmar que falla**

Run: `npm run test:run -- src/services/visitorStorage.test.ts`

Expected: FAIL porque `visitorStorage.ts` y sus exportaciones todavía no existen.

- [ ] **Step 4: Implementar tipos y almacenamiento mínimo**

Definir en `src/types/visitor.ts`:

```ts
export type VisitorType = 'child' | 'adult'
export type EntryMode = 'individual' | 'group'

export interface VisitorDraft {
  name: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  responsibleName?: string
  groupMembers: string[]
}

export interface VisitorEntry extends VisitorDraft {
  id: string
  createdAt: string
}
```

Implementar en `src/services/visitorStorage.ts` la clave `finca-lluvias:visitors:v1`, un lector seguro que solo acepta arreglos, orden descendente por `createdAt` y `create` que construye el registro, intenta persistir y solo entonces lo devuelve. Ambas operaciones serán `async` aunque usen `localStorage`, para conservar el contrato que necesitará Firebase. Convertir cualquier error de escritura en `new Error('No fue posible guardar el registro.')`.

- [ ] **Step 5: Ejecutar pruebas de almacenamiento**

Run: `npm run test:run -- src/services/visitorStorage.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts eslint.config.js .gitignore src/vite-env.d.ts src/types src/services src/test
git commit -m "feat: scaffold visitor registration storage"
```

### Task 2: Formulario, validación y campos condicionales

**Files:**
- Create: `src/utils/date.ts`
- Create: `src/components/RegistrationForm.tsx`
- Create: `src/components/RegistrationForm.test.tsx`

**Interfaces:**
- Consumes: `VisitorDraft`, `VisitorType`, `EntryMode` from `src/types/visitor.ts`.
- Produces: `<RegistrationForm onSubmit={(draft: VisitorDraft) => Promise<boolean>} isSaving={boolean} />`.
- Produces: `getLocalDateInputValue(date?: Date): string`.

- [ ] **Step 1: Escribir pruebas fallidas del formulario**

Cubrir con React Testing Library y `userEvent`:

```tsx
it('starts as adult, individual and today', () => {
  render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(true)} isSaving={false} />)
  expect(screen.getByRole('radio', { name: 'Adulto' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Individual' })).toBeChecked()
  expect(screen.getByLabelText('Fecha')).toHaveValue(getLocalDateInputValue())
})

it('shows base validation errors without submitting', async () => {
  const onSubmit = vi.fn().mockResolvedValue(false)
  render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))
  expect(await screen.findByText('Ingresa el nombre completo.')).toBeVisible()
  expect(screen.getByText('Ingresa la identificación.')).toBeVisible()
  expect(screen.getByText('Selecciona la nacionalidad.')).toBeVisible()
  expect(onSubmit).not.toHaveBeenCalled()
})

it('requires group details and normalizes one member per line', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true)
  render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
  await userEvent.click(screen.getByRole('radio', { name: 'Grupo' }))
  expect(screen.getByLabelText('Persona encargada')).toBeVisible()
  expect(screen.getByLabelText('Nombres del grupo')).toHaveAttribute('maxLength', '500')
  await fillBaseFields()
  await userEvent.type(screen.getByLabelText('Persona encargada'), 'Laura Gómez')
  await userEvent.type(screen.getByLabelText('Nombres del grupo'), 'Eva{enter}{enter}Mateo')
  await userEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    entryMode: 'group',
    responsibleName: 'Laura Gómez',
    groupMembers: ['Eva', 'Mateo'],
  }))
})

it('clears the form without calling onSubmit', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true)
  render(<RegistrationForm onSubmit={onSubmit} isSaving={false} />)
  await userEvent.type(screen.getByLabelText('Nombre'), 'Texto temporal')
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar formulario' }))
  expect(screen.getByLabelText('Nombre')).toHaveValue('')
  expect(onSubmit).not.toHaveBeenCalled()
})
```

El helper `fillBaseFields` completa Nombre, Identificación y Nacionalidad con consultas por etiqueta.

- [ ] **Step 2: Ejecutar las pruebas y confirmar que fallan**

Run: `npm run test:run -- src/components/RegistrationForm.test.tsx`

Expected: FAIL porque el componente y el helper de fecha no existen.

- [ ] **Step 3: Implementar el formulario mínimo y accesible**

Usar estado controlado local. Renderizar inputs con las etiquetas exactas `Nombre`, `Identificación`, `Fecha`, `Nacionalidad`, dos `fieldset` para tipo y modalidad y botones `Limpiar formulario` y `Registrar ingreso`. Las opciones de nacionalidad serán Costa Rica, Nicaragua, Panamá, Colombia, Estados Unidos, Canadá, México, España y Otra.

La validación producirá exactamente estos mensajes:

```ts
const requiredMessages = {
  name: 'Ingresa el nombre completo.',
  identification: 'Ingresa la identificación.',
  visitDate: 'Selecciona la fecha.',
  nationality: 'Selecciona la nacionalidad.',
  responsibleName: 'Ingresa la persona encargada.',
  groupMembers: 'Agrega al menos un integrante del grupo.',
}
```

Los errores usarán `aria-describedby` y el resumen tendrá `role="alert"`. Los controles de grupo solo se renderizan para `entryMode === 'group'`. Antes de invocar `onSubmit`, aplicar `trim()` y convertir `groupMembersText.split(/\r?\n/)` en nombres no vacíos. Esperar el resultado de `onSubmit`; reiniciar el formulario únicamente cuando resuelva `true`.

- [ ] **Step 4: Ejecutar las pruebas del formulario**

Run: `npm run test:run -- src/components/RegistrationForm.test.tsx`

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts src/components/RegistrationForm.tsx src/components/RegistrationForm.test.tsx
git commit -m "feat: add accessible visitor form"
```

### Task 3: Aplicación, encabezado e ingresos recientes

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/RecentEntries.tsx`
- Create: `src/components/RecentEntries.test.tsx`

**Interfaces:**
- Consumes: `RegistrationForm`, `VisitorDraft`, `VisitorEntry`, `visitorStorage`.
- Produces: `<RecentEntries entries={VisitorEntry[]} />`.
- Produces: la aplicación funcional montada desde `src/main.tsx`.

- [ ] **Step 1: Escribir pruebas fallidas del listado y la integración**

En `RecentEntries.test.tsx`, construir seis registros con `createdAt` consecutivos y comprobar que solo aparecen los cinco primeros recibidos, que Grupo muestra `Grupo` y el responsable, e Individual muestra `Individual` y `—`.

En `App.test.tsx`, mockear el módulo de almacenamiento:

```tsx
vi.mock('./services/visitorStorage', () => ({
  visitorStorage: {
    list: vi.fn(async () => []),
    create: vi.fn(),
  },
}))

it('saves a valid visitor, refreshes recent entries and announces success', async () => {
  vi.mocked(visitorStorage.create).mockResolvedValue(savedEntry)
  render(<App />)
  await fillAndSubmitIndividualVisitor()
  expect(visitorStorage.create).toHaveBeenCalledOnce()
  expect(await screen.findByText('Ingreso registrado correctamente.')).toBeVisible()
  expect(screen.getByText(savedEntry.name)).toBeVisible()
})

it('announces a storage failure without adding the visitor', async () => {
  vi.mocked(visitorStorage.create).mockRejectedValue(new Error('No fue posible guardar el registro.'))
  render(<App />)
  await fillAndSubmitIndividualVisitor()
  expect(await screen.findByText('No fue posible guardar el registro.')).toBeVisible()
  expect(screen.queryByText('Ingreso registrado correctamente.')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar las pruebas y confirmar que fallan**

Run: `npm run test:run -- src/components/RecentEntries.test.tsx src/App.test.tsx`

Expected: FAIL porque `App`, `Header` y `RecentEntries` no existen.

- [ ] **Step 3: Implementar componentes e integración**

`Header` mostrará logo, `Finca Lluvias del Valle`, `Control de visitantes` y tres elementos de navegación. Registro de ingreso tendrá `aria-current="page"`; Historial e Información serán texto visualmente equivalente con `aria-disabled="true"`.

`RecentEntries` aplicará `entries.slice(0, 5)`. Cada entrada mostrará nombre, fecha mediante `Intl.DateTimeFormat('es-CR')`, modalidad y responsable. Si no hay registros, mostrará `Aún no hay ingresos registrados.`.

`App` iniciará el estado vacío y cargará `visitorStorage.list()` dentro de un efecto seguro. `handleSubmit` devolverá `Promise<boolean>`: activa `isSaving`, espera `visitorStorage.create`, agrega el resultado al principio, conserva como máximo cinco y devuelve `true`; ante error anuncia el mensaje y devuelve `false`; finalmente desactiva `isSaving`. La confirmación usará `role="status"` y el error `role="alert"`.

- [ ] **Step 4: Ejecutar pruebas de integración**

Run: `npm run test:run -- src/components/RecentEntries.test.tsx src/App.test.tsx`

Expected: todos los tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx src/App.test.tsx src/components/Header.tsx src/components/RecentEntries.tsx src/components/RecentEntries.test.tsx
git commit -m "feat: connect registration and recent entries"
```

### Task 4: Identidad visual, decoración cafetalera y responsive

**Files:**
- Create: `src/styles/global.css`
- Create: `src/assets/brand-mark.svg`
- Create: `src/assets/coffee-botanical.png`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/RegistrationForm.tsx`
- Modify: `src/components/RecentEntries.tsx`

**Interfaces:**
- Consumes: el DOM y nombres accesibles ya probados en Tasks 2 y 3.
- Produces: diseño visual completo sin cambiar los contratos de componentes.

- [ ] **Step 1: Crear los recursos visuales**

Crear `brand-mark.svg` como sello oval crema con borde verde, una hoja y frutos de café simplificados, y texto decorativo `LLUVIAS DEL VALLE`; conservar el nombre accesible fuera del SVG mediante el encabezado.

Generar `coffee-botanical.webp` con el flujo ImageGen incorporado y este prompt:

```text
Use case: illustration-story
Asset type: decorative background for a responsive coffee farm visitor-registration website
Primary request: an original refined botanical composition inspired by a Costa Rican coffee farm, with glossy coffee leaves, clusters of ripe red coffee cherries, one elegant brown butterfly, and very faint engraved mountain-and-field line art
Style/medium: premium natural-history botanical illustration blended with subtle vintage engraving, realistic leaves and fruit, warm editorial finish
Composition/framing: wide transparent-feeling composition with separate visual clusters near the upper-right and lower-left edges; generous empty cream-toned center for UI content
Lighting/mood: soft natural light, calm welcoming rural atmosphere
Color palette: forest green, muted olive, coffee brown, ripe cherry red, warm parchment
Constraints: decorative edge elements only; no text, no logo, no people, no buildings, no watermark; keep the center low contrast and uncluttered
```

Guardar el resultado seleccionado dentro de `src/assets/coffee-botanical.png`, no en una ruta temporal ni bajo el directorio global de imágenes generadas.

- [ ] **Step 2: Implementar estilos globales y estados**

Importar las fuentes locales Cormorant Garamond y DM Sans en `src/main.tsx`. Definir variables:

```css
:root {
  --forest-950: #102e20;
  --forest-800: #19452f;
  --forest-700: #286044;
  --cream-50: #fffdf7;
  --cream-100: #f8f1e4;
  --coffee-700: #6a4635;
  --terracotta-600: #a74d3a;
  --ink: #24271f;
  --muted: #736e64;
  --line: #ded2bf;
  --shadow: 0 18px 45px rgb(48 39 25 / 10%);
}
```

Aplicar encabezado verde de altura aproximada de 112 px; cuerpo crema con textura CSS de ruido sutil y el recurso botánico en una capa `pointer-events: none`. La región principal tendrá ancho máximo de 1280 px y cuadrícula `minmax(0, 1.65fr) minmax(340px, 1fr)`. Las tarjetas usarán fondo crema translúcido, borde, radio de 18 px y `--shadow`.

El formulario usará cuadrícula de dos columnas para campos base, opciones segmentadas con iconos Lucide, foco `outline` de alto contraste, error terracota y botón primario verde. Los campos de grupo ocuparán una subcuadrícula con el textarea más ancho. El listado tendrá filas separadas y badges verde/terracota para modalidad.

- [ ] **Step 3: Implementar breakpoints y preferencias del usuario**

En `@media (max-width: 980px)`, apilar las tarjetas. En `@media (max-width: 680px)`, reducir encabezado, ocultar el texto de navegación secundaria dejando la opción activa, convertir todas las cuadrículas del formulario en una columna y representar cada ingreso como tarjeta de definición. Añadir `@media (prefers-reduced-motion: reduce)` para eliminar transiciones y `@media (prefers-contrast: more)` para reforzar bordes.

- [ ] **Step 4: Ejecutar toda la suite tras el cambio visual**

Run: `npm run test:run`

Expected: todos los tests PASS; los nombres accesibles y comportamientos no cambian.

- [ ] **Step 5: Commit**

```bash
git add src/assets src/styles src/main.tsx src/App.tsx src/components
git commit -m "feat: apply coffee farm visual design"
```

### Task 5: Verificación de producción y QA visual

**Files:**
- Modify: `README.md`
- Modify: any implementation file only when a verification failure requires a focused correction.

**Interfaces:**
- Consumes: aplicación completa de Tasks 1–4.
- Produces: comandos documentados y evidencia de que la entrega compila, prueba y responde correctamente.

- [ ] **Step 1: Documentar uso y futura migración**

Crear `README.md` con requisitos, `npm install`, `npm run dev`, `npm run test:run`, `npm run build`, clave de almacenamiento y una nota explícita: Firebase debe reemplazar la implementación de `visitorStorage` conservando las firmas asíncronas de `list` y `create`.

- [ ] **Step 2: Ejecutar verificación automatizada fresca**

Run: `npm run lint`

Expected: exit 0, sin errores.

Run: `npm run test:run`

Expected: exit 0, todos los tests PASS.

Run: `npm run build`

Expected: exit 0 y archivos generados en `dist/`.

- [ ] **Step 3: Verificar visualmente en navegador**

Iniciar `npm run dev -- --host 127.0.0.1` y revisar al menos 1440×1000, 768×1024 y 390×844. Confirmar: no hay desbordamiento horizontal, encabezado y tarjetas siguen la referencia, el fondo no tapa controles, el flujo Grupo funciona, el registro aparece en el listado y persiste después de recargar.

- [ ] **Step 4: Revisar el estado final del repositorio**

Run: `git status --short`

Expected: solo cambios deliberados de documentación o correcciones realizadas en esta tarea; `dist/` y resultados temporales no están versionados.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add visitor app setup guide"
```
