# Diseño del registro de visitantes

## Objetivo

Crear una aplicación web responsive para Finca Lluvias del Valle que reproduzca la estética de la referencia suministrada y permita registrar visitantes. La primera versión utilizará `localStorage`; su arquitectura aislará la persistencia para poder sustituirla posteriormente por Firebase sin modificar la interfaz ni las reglas del formulario.

## Alcance

Esta versión incluye una única pantalla funcional: **Registro de ingreso**. Las opciones **Historial** e **Información** aparecen en el encabezado para conservar la composición visual, pero permanecen inactivas y accesiblemente marcadas como no disponibles.

La pantalla permite:

- Capturar los datos de una persona visitante.
- Elegir tipo de visitante: niño o adulto.
- Elegir modalidad: individual o grupo.
- Capturar responsable e integrantes cuando la modalidad es grupo.
- Validar los datos antes de registrar.
- Persistir los registros en el navegador.
- Mostrar los cinco ingresos más recientes.
- Limpiar el formulario sin eliminar los registros existentes.

Quedan fuera de esta versión: autenticación, sincronización remota, Firebase, edición o eliminación de registros, historial completo y página de información.

## Arquitectura

El proyecto se construirá con Vite, React, TypeScript y npm. La aplicación será una SPA de una sola pantalla sin enrutador ni gestor de estado global.

Las responsabilidades se dividirán así:

- `App`: compone la pantalla, mantiene la lista visible y coordina el alta de registros.
- `Header`: presenta la marca y la navegación; solo Registro de ingreso está activo.
- `RegistrationForm`: gestiona valores, selección, validación, limpieza y envío.
- `RecentEntries`: presenta un máximo de cinco registros, ordenados del más reciente al más antiguo.
- `visitorStorage`: expone operaciones para listar y crear registros sin revelar que la implementación actual utiliza `localStorage`.
- `types`: define el modelo compartido y los valores permitidos.

La capa de almacenamiento tendrá una interfaz estable para que una implementación futura de Firebase conserve el mismo contrato. Los componentes no accederán directamente a `localStorage`.

## Modelo de datos

Cada registro contendrá:

- `id`: identificador único generado al guardar.
- `name`: nombre completo.
- `identification`: número de cédula o identificación.
- `visitDate`: fecha de la visita en formato ISO `YYYY-MM-DD`.
- `nationality`: nacionalidad seleccionada.
- `visitorType`: `child` o `adult`.
- `entryMode`: `individual` o `group`.
- `responsibleName`: nombre de la persona encargada, presente solo para grupos.
- `groupMembers`: lista de nombres no vacíos, presente solo para grupos.
- `createdAt`: fecha y hora ISO en que se creó el registro.

Los datos se guardarán bajo una clave versionada para evitar colisiones y facilitar futuras migraciones.

## Flujo y reglas del formulario

Al abrir la aplicación, la fecha toma el día local actual. El usuario completa nombre, identificación, fecha y nacionalidad; además selecciona tipo de visitante y modalidad. Adulto e Individual serán las selecciones iniciales para ofrecer un flujo común y predecible.

Todos los campos base son obligatorios. Cuando se elige Grupo, aparecen Persona encargada y Nombres del grupo; ambos pasan a ser obligatorios. Los nombres del grupo se ingresan uno por línea, se normalizan eliminando líneas vacías y el texto se limita a 500 caracteres.

Al enviar:

1. Se validan y normalizan los valores.
2. Si hay errores, se muestran junto a los campos correspondientes y se anuncia un resumen accesible.
3. Si el formulario es válido, se crea el registro, se persiste y se actualiza inmediatamente el listado lateral.
4. Se muestra una confirmación accesible y se reinicia el formulario a sus valores iniciales.

El botón Limpiar solo reinicia el formulario y sus mensajes; no modifica el historial guardado.

## Persistencia y recuperación

`visitorStorage` serializa los registros como JSON. Al leer, valida que exista un arreglo antes de usarlo. Si la clave no existe o el contenido no puede interpretarse, devuelve una lista vacía y mantiene la aplicación operativa.

Si el navegador rechaza una escritura, el registro no se agrega a la lista visible y la interfaz informa que no fue posible guardarlo. Este comportamiento evita comunicar éxito cuando los datos no quedaron persistidos.

## Diseño visual

La interfaz conservará la composición principal de la referencia:

- Encabezado verde bosque con logo, nombre de la finca, subtítulo y navegación.
- Fondo crema con textura ligera tipo papel.
- Título editorial grande y texto introductorio.
- Tarjeta principal del formulario a la izquierda y tarjeta de ingresos recientes a la derecha.
- Paleta de verde bosque, crema, café y acentos terracota.
- Tipografía serif en títulos y sans-serif en controles y contenido funcional.
- Bordes finos, radios suaves y sombras discretas.

Se crearán recursos visuales propios para la marca y la decoración. La decoración botánica estará inspirada en el ambiente cafetalero de la imagen —ramas de café, hojas, mariposa y paisaje lineal— sin cubrir controles ni reducir la legibilidad.

En escritorio se utilizará una cuadrícula de dos columnas. En tablet y móvil, el contenido se apilará; la navegación se compactará, los controles mantendrán áreas táctiles cómodas y la tabla se transformará en una lista legible sin desplazamiento horizontal obligatorio.

## Accesibilidad

- Todos los campos tendrán etiquetas asociadas.
- Los grupos de opciones usarán semántica de grupo y estado seleccionado perceptible sin depender solo del color.
- Los errores estarán vinculados a sus controles.
- Los mensajes de éxito y error usarán regiones anunciables.
- El foco será visible con teclado.
- Los enlaces inactivos no simularán navegación funcional.
- El contraste de texto y controles buscará cumplir WCAG AA.
- Las ilustraciones decorativas se ocultarán a tecnologías de asistencia.

## Pruebas

Se utilizarán Vitest, React Testing Library y `user-event`. Las pruebas cubrirán:

- Lectura, escritura, orden y recuperación ante JSON inválido en `visitorStorage`.
- Renderizado inicial y valores predeterminados.
- Validación de campos base.
- Aparición y validación de campos de grupo.
- Registro exitoso y actualización del listado reciente.
- Manejo visible de un fallo de persistencia.
- Limpieza del formulario sin borrar registros.
- Límite de cinco elementos en ingresos recientes.

La validación final incluirá compilación de producción y revisión visual en anchos de escritorio y móvil.

## Criterios de aceptación

- El proyecto se ejecuta con `npm run dev` y compila con `npm run build`.
- La pantalla refleja de forma reconocible la composición y personalidad visual de la referencia.
- El formulario funciona íntegramente con teclado y muestra validaciones comprensibles.
- Los registros válidos sobreviven a una recarga del navegador.
- Los cinco registros más recientes se muestran inmediatamente después de registrar.
- La modalidad Grupo exige responsable e integrantes; Individual no conserva esos datos.
- Limpiar no elimina el historial.
- Un error de almacenamiento no genera un falso mensaje de éxito.
- La interfaz es utilizable sin desbordes en móvil, tablet y escritorio.
- La persistencia está aislada detrás de `visitorStorage`, lista para una implementación futura con Firebase.
