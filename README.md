# Registro de visitantes — Finca Lluvias del Valle

Aplicación web para registrar visitantes de la finca, incluyendo visitas individuales y grupos, y consultar los registros recientes. Los datos se guardan localmente en el navegador.

## Requisitos

- Node.js 20.19 o superior (también es compatible Node.js 22.12 o superior)
- npm

## Instalación y uso local

```bash
npm install
npm run dev
```

Vite mostrará la dirección local de la aplicación en la terminal. Por defecto suele ser `http://localhost:5173`.

## Comandos disponibles

```bash
npm run dev       # inicia el servidor de desarrollo
npm run lint      # ejecuta ESLint
npm run test:run  # ejecuta la suite de pruebas una vez
npm run build     # genera la versión de producción en dist/
npm run preview   # sirve localmente la versión generada
```

## Persistencia local

Los registros se almacenan en `localStorage` bajo la clave:

```text
finca-lluvias:visitors:v1
```

El almacenamiento pertenece al navegador y al origen donde se ejecuta la aplicación. Limpiar los datos del sitio o usar otro navegador, perfil, puerto u origen puede mostrar una lista distinta o vacía.

## Migración futura a Firebase

La persistencia está encapsulada en `src/services/visitorStorage.ts`. Una integración futura con Firebase debe reemplazar la implementación de `visitorStorage`, conservando las firmas asíncronas de `list` y `create`. Así, los componentes pueden seguir consumiendo el mismo contrato sin acoplarse al proveedor de almacenamiento.
