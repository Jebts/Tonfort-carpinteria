# Tonfort — Reglas de negocio

## 1. Roles

El sistema distingue tres roles de staff, definidos en la tabla `usuarios` (campo `rol`):

- **Admin** (`admin`): control total sobre la plataforma — usuarios, portafolio, publicación, agenda y asignación de proyectos.
- **Asesor** (`asesor`): gestor comercial — agenda, citas, clientes y proyectos asignados.
- **Diseñador** (`disenador`): creador de contenido visual — proyectos, productos, propuestas de video y animaciones.

| Acción | Diseñador | Administrador | Asesor |
|---|:---:|:---:|:---:|
| Crear/editar proyectos y productos | ✅ (solo desde diseño, sin cliente) | ❌ | ❌ |
| Subir videos globales y animaciones | ✅ | ❌ | ❌ |
| Transición propuesta `borrador` → `lista` | ✅ (con video + frame centro) | ❌ | ❌ |
| Transición propuesta → `enviada` | ❌ | ✅ | ✅ |
| Activar/desactivar link privado de propuesta | ✅ (con video + frame centro) | ✅ | ✅ |
| Publicar propuesta en Portafolio público | ❌ | ✅ (solo si `enviada`) | ❌ |
| Publicar proyecto en Portafolio (`publicado`) | ❌ | ✅ | ❌ |
| Editar `sede` / `categoria` / `portada_url` de un proyecto publicado | ❌ | ✅ | ❌ |
| Subir / borrar fotos de la galería del proyecto | ❌ | ✅ | ❌ |
| Editar los visores de la landing (`/staff/administracion/visores`) | ❌ | **Lectura y escritura** | ❌ |
| Crear cotizaciones (conectar proyecto + cliente) | ❌ | ✅ | ❌ |
| Gestionar agenda y citas | ❌ | ✅ | ✅ |
| Gestión de usuarios staff (crear/editar/desactivar) | ❌ | ✅ | ❌ |
| Ver proyectos de otros roles | ❌ | ✅ | ❌ |

### Gestión de cuentas de staff (exclusiva Administrador)

El Administrador tiene la capacidad exclusiva de:
- **Crear** usuarios con rol `asesor` o `disenador` (nunca auto-escalar a `admin`).
- **Editar** cualquier usuario: nombre, email, rol, foto_perfil, bio_publica, activo.
- **Desactivar** (`activo = false`) cuentas de `asesor` o `disenador`.
- **Ver** listado completo con estado.

**Reglas de seguridad:**
- El Administrador NO puede crear usuarios con rol `admin`.
- El Administrador NO puede desactivar su propia cuenta.
- El sistema garantiza al menos 1 `admin` activo en todo momento.
- Un usuario con `activo = false` no puede iniciar sesión ni recibir citas en la Agenda pública.

## 2. Propuestas de Video y Estados de Propuesta

Las propuestas de diseño se gestionan en la tabla `propuestas_3d`. Cada propuesta pertenece a un `producto` dentro de un `proyecto`.

### Estados de Propuesta (`estado`)

| Estado | Descripción | Requisitos de transición |
|---|---|---|
| `borrador` | Propuesta en proceso de edición y carga de material. | Estado inicial por defecto. |
| `lista` | Propuesta terminada por el diseñador y lista para revisión o envío. | Requiere obligatoriamente `video_global_url != null` y `frame_centro_ms != null`. El diseñador solo puede pasar de `borrador` a `lista`. |
| `enviada` | Propuesta formalmente presentada o compartida con el cliente. | Solo `admin` o `asesor` pueden pasar una propuesta a `enviada`. |

### Enlace Privado de Propuesta (`link_privado`)

- Cada propuesta puede generar un `link_token` criptográfico único de 32 bytes (64 caracteres hex).
- Para activar el enlace (`link_activo = true`), la propuesta debe contar con `video_global_url` y `frame_centro_ms`.
- Al desactivarse (`link_activo = false`), el token se invalida (`null`) o deja de responder con la propuesta.
- La ruta pública cliente es `/propuestas/[token]`.

### Publicación en Portafolio (`publicar-portafolio`)

- La publicación en el portafolio público se realiza **exclusivamente desde el panel de administración** (`/staff/administracion/portafolio`).
- Una propuesta puede publicarse en el catálogo público (`publicada_portafolio = true`) únicamente si:
  1. Su estado es `enviada` (`estado = 'enviada'`).
  2. La acción es realizada por un usuario con rol `admin`.
  3. El proyecto al que pertenece tiene `publicado = true` para ser indexado en `/portafolio`.
- **Diseñadores**: Solo pueden activar links privados para compartir propuestas con clientes; no pueden publicar en el portafolio público.

### La ficha pública del proyecto es plana

El portafolio público ya **no** es un árbol de proyecto → producto → propuesta. Cada proyecto
publicado tiene **una** página, `/portafolio/[sede]/[slug]`, con portada, galería y —si el
proyecto tiene propuesta publicada— un visor. Consecuencias:

- **Sede** (`proyectos.sede`, catálogo cerrado `santa_marta` / `bogota`): decide en qué lista de
  `/portafolio` aparece. Es `NOT NULL DEFAULT 'santa_marta'`, así que los proyectos existentes se
  rellenan solos. `bogota` es histórico: la sede ya no existe y solo aporta fotos al catálogo.
  Cambiar la sede mueve el proyecto entre la lista de Santa Marta y la de Bogotá.
- **Categoría** (`proyectos.categoria`, catálogo cerrado de 7 valores): **un solo valor por
  proyecto**, y **nullable**. Los proyectos existentes salen como "Sin categoría" hasta que
  staff asigne una; ninguno queda fuera del listado por no tenerla, solo del filtro
  `?categoria=`. El staff puede volver a dejarla en nulo a propósito.
- **Portada** (`proyectos.portada_url`): imagen a sangre de la ficha. Si es nula, la tarjeta usa
  `FALLBACK_PORTADA` (`/tonfort-closet-render.png`); la ficha se renderiza sin portada a sangre.
- **Galería** (`proyectos_fotos`): orden explícito por `orden`. El alta de cada foto calcula
  `max(orden) + 1`, así que la foto nueva siempre queda al final y el orden público nunca es
  indeterminado.

Quién puede tocar qué:

| Acción | Rol |
|---|---|
| Cambiar `sede`, `categoria`, `portada_url`, `publicado`, título o descripción | `admin` (endpoint `/api/staff/administracion/portafolio/proyectos/[id]`) |
| Subir, usar como portada o eliminar una foto de la galería | `admin` (endpoints `.../fotos` y `.../fotos/[fotoId]`) |

Las categorías válidas son un enum cerrado en la BD (`categoria_mueble`) y un array literal
duplicado en `CATEGORIAS_MUEBLE_SCHEMA` (`lib/validators.ts`) para Zod, con `lib/categorias.ts`
como copia única de labels y copy. Si se añade una categoría hay que tocar las tres: enum,
array de Zod y catálogo de `lib/categorias.ts` (este último lanza en tiempo de carga si se
desincroniza).

### Animaciones Secundarias (`propuestas_3d_animaciones`)

- Cada propuesta puede contener clips de video complementarios que muestran detalles específicos o interacciones:
  - `zoom`: Acercamiento a texturas, uniones o iluminación de una zona específica.
  - `interaccion`: Movimiento mecánico (apertura de puertas, cajones extraíbles, iluminación LED on/off).
- Propiedades:
  - `titulo`: Etiqueta descriptiva (ej. "Apertura cajón cubiertero").
  - `segundo_inicio_ms`: Marca de tiempo en el video global donde se sitúa la interacción.
  - `duracion_ms`: Duración estimada de la animación.
  - `video_accion_url`: URL del video de la animación en el bucket `visores-video`.

## 3. Estados de cita

| Estado | Descripción |
|---|---|
| `en_espera` | Solicitada vía web; el staff debe aceptarla. El público puede volver a pedir el mismo slot. |
| `aceptada` | Confirmada por el staff; tiene `meet_link`. El público no la puede mover. |
| `cancelada` | Cancelada; oculta para el público, visible solo en staff Agenda. |

### Modalidades de cita

La agenda pública ofrece exactamente **2 modalidades**, y son las filas de
`modalidades_cita` con `activo = true`. El catálogo vive en la BD, no en el código: la página
`/agenda/modalidad` lo lee en cada request y, si no hay exactamente 2 activas, muestra
"La agenda está en mantenimiento" con un enlace a WhatsApp en vez de un flujo roto.

| slug | Modalidad | `costo` | `duracion_minutos` | Qué incluye |
|---|---|---|---|---|
| `virtual` | Virtual | 0 | 90 | Videollamada en vivo, prueba de iluminación en tiempo real, estimación de costos |
| `presencial` | Presencial | 70000 | 90 | Visita a tu domicilio, toma de medidas, diagnóstico del espacio |

Reglas del catálogo:

- `slug` es la clave de negocio: es lo que viaja por `?modalidad=` y lo que `POST /api/citas`
  resuelve contra `getModalidadPorSlug()`. `nombre` y `descripcion` son copy y pueden cambiar
  sin tocar código.
- La columna `nombre` también es única en la práctica: el `INSERT` de la migración usa
  `ON CONFLICT DO NOTHING`, así que las filas no se duplican si ya existen con esos nombres.
- No hay más modalidades sin cambiarlas las tres cosas a la vez: la migración, el catálogo en
  BD y `BULLETS`/`ICONO`/`ETIQUETA` en `app/agenda/modalidad/page.tsx` (que tienen un `default`
  por si acaso).

### El precio lo pone el servidor, nunca el cliente

- `modalidades_cita.costo` es la **única fuente de verdad** del precio de una cita.
- El formulario público no manda precio. `POST /api/citas` resuelve la modalidad por `slug` y,
  si no existe, devuelve error antes de tocar la BD.
- Al crear la cita el servidor copia dos campos del catálogo a la fila:
  `costo` → `citas.precio_copiado`, `duracion_minutos` → `citas.duracion_minutos`.
- `precio_copiado` es una **fotografía del precio en el momento de la reserva**: si mañana sube
  el costo de la visita presencial, las citas ya reservadas conservan el precio con el que se
  contrató. Staff edita `precio_copiado` desde `/staff/gestion/citas` si necesita renegociar;
  el público no puede escribirlo.

### Disponibilidad por modalidad

El slot se ocupa **por modalidad**, no en bloque:

- `calcularDisponibilidad(desde, hasta, { modalidadId })` resuelve el estado de cada bloque
  mirando solo las citas de esa modalidad. Una cita `virtual` **no** bloquea el mismo bloque
  para una cita `presencial`, y viceversa.
- `GET /api/citas` acepta `?modalidad=<slug|id>`. Sin el parámetro devuelve la disponibilidad
  agregada; con él devuelve la de esa modalidad. En ambos casos nunca expone citas `canceladas`
  ni datos de contacto.
- `virtual` y `presencial` duran 90 minutos: la rejilla de bloques se calcula con la duración
  de la modalidad elegida, no con la de 120 por defecto. Cada bloque de la retícula sigue siendo
  de 2 h; los 30 min que sobran tras una cita de 1 h 30 m son la gabela (tolerancia/gracia)
  entre citas.
- `/agenda/horario` sin un `?modalidad=` que resuelga contra el catálogo responde **404**. No es
  un calendario vacío: es un error de navegación.

### La confirmación cierra el bloque

- `aceptada` es el **único estado que ocupa el bloque**: no se puede crear ni confirmar otra
  cita en el mismo bloque (`fecha_hora` + `modalidad_id`). Es el cupo real.
- **`en_espera` no bloquea**: mientras la solicitud no esté confirmada, el público puede seguir
  pidiendo el mismo bloque (es justo lo que valida `validarSlotLibre`, que solo mira `aceptada`).
  La grilla lo muestra disponible con un círculo amarillo con el número de solicitudes en espera.
- **Confirmar obliga a resolver el resto del bloque.** Si al confirmar una `en_espera` hay otras
  `en_espera` de la misma `fecha_hora` + `modalidad_id`, el `PATCH` responde **422** con la lista
  de `pendientes` y no cambia nada. Para cada una hay que decir `mover` (¿a qué bloque?) o
  `eliminar`; si la resolución no cubre **todas y ninguna extra**, responde **422**.
- La mudanza se hace primero y el `UPDATE` de la elegida al final: si un destino estuviera
  ocupado (**409**, con el `conflicto`) el bloque queda como estaba.
- `POST /api/staff/citas` **rechaza `estado: "aceptada"`** (422): toda `aceptada` pasa por la
  confirmación del bloque. Crear deja la cita en `en_espera`.
- La aritmética de ocupación (`validarSlotLibre`) usa la **duración real** (`duracion_minutos`
  de la cita; 120 por defecto), no 2 h fijas: una `virtual` de 08:00 termina a las 09:30 y no
  tapona lo que empieza después. Los bloques son contiguos por diseño, así que una cita que
  termina justo cuando empieza la siguiente **no** estorba (intervalos semiabiertos).
- "Mismo bloque" = misma `fecha_hora` de inicio (`slotKey`) y misma modalidad. Una `presencial`
  no se mueve porque se confirme una `virtual`: son servicios distintos.

### Cada bloque se resume en círculos y se abre al clic

- La celda no lista las citas: muestra **un círculo por tipo de cita** con cuántas hay en espera —
  azul `virtual`, verde `presencial`, morado `interna` (sin modalidad), cada uno con anillo amarillo
  para decir "sigue en espera" — y un círculo gris con cuántas `canceladas`.` Los contadores llegan del servidor
  (`DisponibilidadSlot.enEspera` / `.canceladas`), calculados antes de filtrar, así que el público
  ve el número sin recibir ningún dato de contacto.
- En staff, **al hacer clic en el bloque se abre su detalle**: la lista completa de sus citas con
  modalidad, origen, estado, teléfono, descripción, Meet, precio/dirección y las acciones de cada
  una (Confirmar / Mover / Cancelar / Reenviar / Editar / Eliminar). Ahí se ejecuta la dinámica de
  confirmación: al confirmar una, el resto de `en_espera` del bloque debe moverse o eliminarse,
  **eligendo el destino de cada una por separado** (`dialogo-bloque.tsx`).
- El `+` de la celda solo aparece en bloques sin `aceptada`; en el público, la celda con `en_espera`
  sigue siendo seleccionable.

### La agenda es una sola grilla

- La retícula (`components/tonfort/agenda/grilla-bloques.tsx`) es **una**: la usa
  `/agenda/horario` (público) y `/staff/gestion/agenda` (staff). No hay parrilla propia de staff.
- 4 bloques fijos (`BLOQUES`, 08/10/14/16) × **Lun–Sáb**: el domingo no es laborable y no se
  pinta como columna.
- **Todo se calcula en UTC** (slots, `slotKey`, semana vía `inicioSemana`): es como se generan
  los slots y como se guardan `citas.fecha_hora`. Cualquier aritmética en hora local descoloca
  los bloques (fue el bug de staff: mostraba 05:00 donde la cita era a las 10:00).
- En staff, las citas que **no** caen en un bloque (p. ej. 09:00 o 21:00) no entran en la regla
  de cupo por bloque; se listan aparte como "Citas fuera de bloque" para no perderlas de vista.

### Dirección de la cita presencial

- `citas.direccion` es **nullable** y se rellena desde el panel de staff
  (`/staff/gestion/citas`), no desde el formulario público: la dirección se acuerda por
  WhatsApp y al crear la cita la modalidad aún no se conoce.
- El formulario público se queda en 3 campos (nombre, teléfono, descripción). Es una decisión
  ya implementada, no un pendiente.
- El panel muestra el campo siempre, con la etiqueta "Dirección de la visita", y muestra el
  valor **también en la tabla de la lista**, para que el diseñador lo vea al confirmar la cita.
- El PATCH de staff lo valida con `citaStaffSchema`: máximo 400 caracteres, nullable.

### Acciones sobre citas (staff)

`PATCH /api/staff/citas/[id]` con body `{ "accion": "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar",
"fecha_hora"?: "ISO", "resolucion"?: [{ "id": "uuid", "accion": "mover" | "eliminar", "fecha_hora"?: "ISO" }] }`.

- `aceptar` — la cita pasa a `aceptada`. Si en el bloque hay otras `en_espera` de la misma
  modalidad, responde **422** con `pendientes`; la UI abre el diálogo
  `dialogo-bloque.tsx` y se reintenta con `resolucion`. **409** si el bloque ya tiene
  otra confirmada. Devuelve `{ cita, resueltas }`.
- `cancelar` — la cita pasa a `cancelada`.
- `mover` — reprograma la cita; el campo `movida = true` y `fecha_hora_anterior` guarda la fecha original.
  Valida el destino con la regla de cupo: **409** (con `conflicto`) si ya hay una `aceptada` de
  esa modalidad solapando.
- `eliminar` — elimina físicamente. Solo permitido si la cita está `cancelada` o `en_espera`.
- `reenviar` — devuelve una `aceptada` a `en_espera`.

Sin `accion`, el mismo handler valida el cuerpo con `citaStaffSchema.partial()` y permite editar
campos sueltos (`direccion`, `notas`, `telefono`, `descripcion`, `modalidad_id`, …). Es la vía
que usa el formulario del panel.

## 4. Fases de cliente

| Fase | Descripción |
|---|---|
| `descubrimiento` | Cliente nuevo, sin cita confirmada. |
| `evaluacion` | Cliente con cita confirmada o en proceso de evaluación de propuesta. |
| `implementacion` | Proyecto activo, en fabricación o instalación. |
| `egresado` | Proyecto completado, cliente satisfecho. |

## 5. Navegación y roles

El panel de staff se organiza en tres secciones role-based:

| Rol | Sección | Ruta base | Notas |
|---|---|---|---|
| `admin` | Administración | `/staff/administracion` | Cotizaciones, usuarios, portafolio (publicación). |
| `asesor` | Gestión | `/staff/gestion` | Agenda, citas, clientes. |
| `disenador` | Diseño | `/staff/diseno` | Proyectos (sin cliente), productos, propuestas 3D y animaciones. |

### Aislamiento de sistemas

- **Proyectos de diseño**: Son independientes de clientes. Se crean desde el panel de diseño sin asociación directa a clientes.
- **Cotizaciones**: Conectan proyectos de diseño con clientes mediante tablas derivadas (`cotizacion_productos`, `cotizacion_propuestas`). Los proyectos se **copian** a las cotizaciones, no se conectan directamente.
- **Portafolio**: Usa la tabla `proyectos` pero la publicación es controlada exclusivamente por administración. Los proyectos pueden publicarse independientemente de su estado en diseño o cotizaciones.

### Flujo de trabajo

1. **Diseñador**: Crea proyectos → productos → propuestas en `/staff/diseno/proyectos`. No asigna clientes directamente.
2. **Administrador**: Crea cotizaciones conectando un proyecto de diseño con un cliente. El sistema copia automáticamente productos y propuestas a tablas derivadas (`cotizacion_productos`, `cotizacion_propuestas`).
3. **Administrador**: Publica proyectos en el portafolio público desde `/staff/administracion/portafolio`.

- El rol se define en la tabla `usuarios` (campo `rol`). Si se omite, se asume `admin`.
- El staff autenticado es redirigido al dashboard de su rol desde `/staff`.
- El sidebar se filtra por rol: cada sección muestra solo los módulos autorizados.
