# Autenticacion y registros privados por usuario

Fecha: 2026-10-13

## Objetivo

Convertir el acceso provisional de Finca Lluvias del Valle en un flujo real de autenticacion con Firebase Authentication. La aplicacion aceptara correo y contrasena y acceso con Google. Cualquier persona podra crear una cuenta o iniciar sesion, pero cada cuenta solo podra consultar y crear sus propios registros de visitas.

La ruta principal sera `/registros`. Si no existe una sesion autenticada, la aplicacion mostrara `/login`. La pagina `/home` y la pantalla de mantenimiento dejaran de formar parte del producto.

## Estado comprobado de produccion

- El proyecto Firebase activo es `finca-lluvias-del-valle`.
- Firestore usa la base `(default)`, edicion Standard, en `nam5`.
- Las reglas desplegadas eran reglas temporales abiertas hasta el 4 de septiembre de 2026. Al vencer, comenzaron a denegar todas las solicitudes del cliente.
- Firebase Authentication no esta inicializado y responde `CONFIGURATION_NOT_FOUND`.
- El sitio desplegado contiene el mismo flujo provisional del repositorio: `/home`, `/login`, `/registros` y un boton de entrada sin autenticacion.
- Los cuatro documentos historicos de `registroVisitas`, que no tenian propietario, fueron eliminados por solicitud del usuario. La lectura posterior confirmo cero documentos.

## Alcance

### Incluido

- Inicializar Firebase Authentication.
- Habilitar correo/contrasena y Google.
- Permitir registro publico de cuentas mediante correo/contrasena.
- Crear o actualizar el perfil privado de cada cuenta en `usuarios/{uid}`.
- Proteger `/registros` mediante el estado real de Firebase Auth.
- Convertir `/` y rutas desconocidas en redirecciones a `/registros`.
- Eliminar `/home` y la pantalla de mantenimiento.
- Cerrar la sesion realmente desde la accion `Salir`.
- Asociar cada visita nueva con `ownerUid`.
- Consultar solo las visitas del usuario autenticado.
- Sustituir las reglas temporales por reglas permanentes de minimo privilegio.
- Agregar los indices necesarios para las consultas por propietario y fecha.
- Eliminar el cache compartido en `localStorage` para evitar filtraciones entre cuentas en un mismo navegador.
- Probar y desplegar Auth, reglas, indices y Hosting.

### Fuera de alcance

- Roles administrativos.
- Una consola para gestionar usuarios.
- Compartir registros entre cuentas.
- Editar o eliminar visitas desde la interfaz.
- Recuperar los cuatro documentos historicos eliminados.
- Un backend o API propios.

## Arquitectura

La aplicacion conservara React, React Router, Firebase Web SDK y Firestore. Se anadira una capa pequena de autenticacion con tres responsabilidades:

1. Inicializar y exponer la instancia de Firebase Auth junto con Firestore.
2. Observar la sesion con `onAuthStateChanged` y representar un estado de carga hasta conocer al usuario.
3. Proteger las rutas y entregar el usuario autenticado a los servicios que necesitan su UID.

Firestore seguira usando la coleccion raiz `registroVisitas`. Cada documento nuevo incluira `ownerUid`. Esta opcion mantiene el contrato actual y evita trasladar los registros a subcolecciones.

## Modelo de datos

### `usuarios/{uid}`

Documento privado creado o sincronizado despues de cada autenticacion exitosa.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `uid` | string | Obligatorio; igual al ID del documento y a `request.auth.uid`. |
| `email` | string | Obligatorio; igual al correo del token autenticado. |
| `displayName` | string | Opcional; longitud limitada. |
| `providers` | list<string> | Obligatorio; conjunto limitado a `password` y `google.com`. |
| `createdAt` | timestamp | Obligatorio e inmutable. |
| `lastLoginAt` | timestamp | Obligatorio; actualizable solo por el propietario. |

El documento no contendra roles ni campos que otorguen privilegios. Cada usuario solo podra leer, crear o actualizar su propio documento. No se permitira listar la coleccion completa ni eliminar perfiles desde el cliente.

Firestore no conserva colecciones vacias. La coleccion `usuarios` aparecera en la consola cuando se cree el primer perfil tras una autenticacion correcta.

### `registroVisitas/{registroId}`

Se conservaran los campos de dominio existentes:

- `id`
- `firstName`
- `firstLastName`
- `secondLastName`
- `identification`
- `visitDate`
- `nationality`
- `visitorType`
- `entryMode`
- `groupMembers`

Se agregaran:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `ownerUid` | string | Obligatorio e igual a `request.auth.uid`. |
| `createdAt` | timestamp en Firestore | Asignado con `serverTimestamp()` y no modificable. |

La interfaz podra seguir trabajando con una fecha ISO si el adaptador de almacenamiento convierte el timestamp al leer. La escritura remota usara el timestamp del servidor para que las reglas puedan comprobar el momento real de creacion.

La aplicacion solo necesita crear y leer visitas. Las reglas negaran actualizar y eliminar documentos desde el cliente.

## Flujo de autenticacion

### Correo y contrasena

La pantalla `/login` incluira correo y contrasena, con dos acciones diferenciadas:

- `Ingresar`: `signInWithEmailAndPassword`.
- `Crear cuenta`: `createUserWithEmailAndPassword`.

La contrasena no se guardara fuera de Firebase Authentication. Los errores se traduciran a mensajes breves para credenciales incorrectas, correo ya utilizado, contrasena debil, exceso de intentos y problemas de red.

### Google

La accion `Continuar con Google` usara `GoogleAuthProvider` y `signInWithPopup`. El dominio de Hosting debe figurar en los dominios autorizados.

Si Firebase informa que el correo ya pertenece a otro proveedor, la interfaz explicara que el usuario debe entrar con el metodo existente. No se crearan perfiles duplicados ni se intentara vincular credenciales silenciosamente.

### Sincronizacion del perfil

Despues de un acceso correcto, la aplicacion escribira `usuarios/{uid}` con `setDoc(..., { merge: true })`:

- En la primera autenticacion establecerá `createdAt`.
- En accesos posteriores conservara `createdAt` y actualizara `lastLoginAt`, correo, nombre visible y proveedores.
- La navegacion a `/registros` ocurrira solo despues de que el perfil quede sincronizado.

Un fallo al sincronizar el perfil dejara la sesion autenticada, mostrara un error recuperable y permitira reintentar. No dara acceso a datos hasta completar la inicializacion.

## Rutas y experiencia de entrada

- `/login`: visible solo sin sesion. Si ya existe sesion, redirige a `/registros`.
- `/registros`: protegida. Mientras Firebase determina la sesion, muestra un estado de carga accesible. Sin sesion, redirige a `/login`.
- `/`: redirige a `/registros`.
- `/home`: deja de existir y redirige a `/registros`.
- Cualquier ruta desconocida redirige a `/registros`.

La accion `Salir` llamara `signOut`. Solo despues de resolver cerrara la vista privada y navegara a `/login`.

## Acceso y almacenamiento de visitas

El servicio de visitas recibira el UID del usuario autenticado.

### Lectura

La consulta aplicara:

- `where('ownerUid', '==', uid)`
- `orderBy('createdAt', 'desc')`

Se declarara el indice compuesto requerido. Las respuestas se convertiran al modelo `VisitorEntry` usado por los componentes.

### Escritura

El cliente generara el ID, pero las reglas exigiran que el campo `id` coincida con el ID del documento. La escritura agregara `ownerUid` y `serverTimestamp()` dentro del adaptador; los componentes no podran suministrar ni cambiar el propietario.

### Cache

Se eliminara el uso actual de `localStorage` como fuente o respaldo. Su clave no incluye UID y podria mostrar datos de una cuenta anterior a otra persona en el mismo navegador. Firestore sera la unica fuente de verdad para los registros autenticados.

## Reglas de seguridad

Las reglas se disenaran con denegacion predeterminada y validadores de dominio.

### Usuarios

- Se exige autenticacion.
- El ID del documento debe coincidir con el UID del token.
- El correo debe coincidir con el correo autenticado.
- Solo se admiten los campos definidos y tipos/limites validos.
- `createdAt` es inmutable.
- No existen campos de rol o administracion.
- No se permite listar ni eliminar perfiles desde el cliente.

### Registros

- Se exige autenticacion.
- La lectura solo se permite cuando `resource.data.ownerUid == request.auth.uid`.
- La creacion exige `request.resource.data.ownerUid == request.auth.uid`.
- Se validan campos obligatorios, tipos, enumeraciones y limites de tamano.
- El ID persistido debe coincidir con el ID del documento.
- `createdAt` debe provenir del servidor y corresponder a la solicitud.
- No se permiten actualizaciones ni eliminaciones desde el cliente.

### Resto de rutas

Todo acceso no declarado se deniega.

Antes del despliegue se ejecutaran pruebas de reglas para acceso anonimo, acceso cruzado entre dos usuarios, contaminacion de esquema, falsificacion de propietario, campos excesivos y operaciones no soportadas.

## Tratamiento de errores

- No se ocultaran fallos remotos mostrando cache local como si fuera informacion actual.
- Los errores se registraran en consola sin tokens, contrasenas ni configuracion sensible.
- La interfaz mostrara mensajes accionables mediante el sistema de avisos existente.
- Un error de lectura dejara una lista vacia con aviso visible.
- Un error de escritura no agregara el registro a la vista ni limpiara el formulario.
- Los estados de autenticacion y guardado deshabilitaran acciones duplicadas.

## Pruebas

El desarrollo seguira ciclos de prueba fallida, implementacion minima y verificacion.

### Pruebas de componentes y rutas

- Crear cuenta con correo y contrasena.
- Iniciar sesion con correo y contrasena.
- Iniciar sesion con Google.
- Mostrar errores de Auth.
- Redirigir una ruta privada sin sesion.
- Evitar mostrar el login con sesion activa.
- Cerrar sesion desde el encabezado.
- Eliminar `/home` como destino principal.

### Pruebas del almacenamiento

- Consultar con el filtro del UID autenticado.
- Crear con `ownerUid` y timestamp de servidor.
- No usar ni devolver datos de `localStorage`.
- Convertir timestamps remotos al modelo de la interfaz.
- Propagar errores de lectura y escritura.

### Pruebas de reglas

- Un anonimo no puede leer ni escribir.
- Usuario A no puede leer ni crear registros de Usuario B.
- Cada usuario solo puede leer y mantener su perfil.
- No se pueden falsificar UID, correo, propietario o ID del registro.
- No se admiten campos extra, tipos incorrectos ni valores fuera de limites.
- No se puede actualizar o eliminar una visita.
- Las consultas reales de la aplicacion funcionan para el propietario.

### Verificacion completa

- Suite de Vitest.
- ESLint.
- Compilacion de produccion.
- Validacion sintactica y pruebas de reglas.
- Prueba local de rutas y experiencia responsive.
- Tras el despliegue, comprobacion de proveedores activos, rutas publicadas, creacion de cuenta, login, escritura y lectura aislada de un registro de prueba.

## Despliegue y comprobacion de produccion

El orden sera:

1. Instalar dependencias y ejecutar las pruebas base.
2. Implementar y validar el cambio local.
3. Inicializar Firebase Authentication.
4. Habilitar correo/contrasena y Google.
5. Confirmar dominios autorizados.
6. Desplegar reglas e indices de Firestore.
7. Desplegar Hosting.
8. Leer nuevamente la configuracion desplegada.
9. Ejecutar una prueba autenticada de extremo a extremo.
10. Eliminar cualquier registro de prueba creado durante la verificacion.

No se imprimiran ni guardaran tokens, contrasenas, secretos OAuth o credenciales de servicio.

## Criterios de aceptacion

- Produccion permite crear cuentas con correo/contrasena y acceder con Google.
- Una sesion valida crea o actualiza su documento en `usuarios/{uid}`.
- La ruta principal es `/registros` y requiere sesion.
- `/home` ya no presenta la pantalla de mantenimiento.
- Cada visita nueva contiene el UID del propietario.
- Una cuenta no puede ver ni escribir registros de otra.
- No existe fallback a datos locales compartidos.
- Las reglas temporales vencidas quedan reemplazadas por reglas permanentes de minimo privilegio.
- Las pruebas, lint y build finalizan correctamente.
- La configuracion y el comportamiento desplegados se verifican despues de cada cambio de produccion.
