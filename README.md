# Registro de visitantes - Finca Lluvias del Valle

Aplicacion web para registrar visitantes de la finca, incluyendo visitas individuales y grupos, y consultar los ingresos recientes. Los registros se guardan en Firestore y se mantienen en cache local en el navegador.

## Requisitos

- Node.js 20.19 o superior, tambien compatible con Node.js 22.12 o superior
- npm

## Instalacion y uso local

```bash
npm install
npm run dev
```

## Configuracion de Firebase

Crea o actualiza el archivo `.env` en la raiz del proyecto con estas variables:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Los registros se guardan en la coleccion de Firestore `registroVisitas`.

Vite mostrara la direccion local de la aplicacion en la terminal. Por defecto suele ser `http://localhost:5173`.

## Flujo de registro

- El visitante principal se registra con `Nombre`, `Primer apellido` y `Segundo apellido`.
- En modalidad `Individual`, no se solicitan integrantes.
- En modalidad `Grupo`, no se solicita una persona encargada adicional: el visitante principal queda como encargado.
- Los integrantes del grupo se escriben en el campo `Nombres del grupo`, uno por linea.
- La lista de ingresos recientes muestra la modalidad, el encargado derivado del visitante principal y los integrantes cuando aplica.
- El tab `Historial` muestra todos los registros guardados y permite filtrar por fecha, nacionalidad, modalidad y busqueda por texto.

## Comandos disponibles

```bash
npm run dev       # inicia el servidor de desarrollo
npm run lint      # ejecuta ESLint
npm run test:run  # ejecuta la suite de pruebas una vez
npm run build     # genera la version de produccion en dist/
npm run preview   # sirve localmente la version generada
```

## Cache local

Ademas del guardado en Firestore, los registros se reflejan en `localStorage` bajo la clave:

```text
finca-lluvias:visitors:v1
```

El almacenamiento pertenece al navegador y al origen donde se ejecuta la aplicacion. Limpiar los datos del sitio o usar otro navegador, perfil, puerto u origen puede mostrar una lista distinta o vacia.
