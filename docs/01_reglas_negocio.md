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

### Acciones sobre citas (staff)
`PATCH /api/staff/citas/[id]` con body `{ "accion": "aceptar" | "cancelar" | "mover" | "eliminar", "fecha_hora"?: "ISO" }`.

- `aceptar` — la cita pasa a `aceptada`, se genera o asigna `meet_link`.
- `cancelar` — la cita pasa a `cancelada`.
- `mover` — reprograma la cita; el campo `movida = true` y `fecha_hora_anterior` guarda la fecha original.
- `eliminar` — elimina físicamente. Solo permitido si la cita está `cancelada` o `en_espera`.

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
