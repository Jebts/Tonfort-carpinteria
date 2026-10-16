# Tonfort — Modelo de datos

Este documento detalla cada entidad, sus campos, relaciones, triggers y políticas de seguridad (RLS). La fuente de verdad técnica es el esquema SQL de `supabase/migrations/` (7 archivos, del `20260919000000_init_clean_schema.sql` al `20260924000000_espacio_publico.sql`) y los tipos TypeScript en `lib/supabase/types.ts`.

> **Estado del esquema en la BD real (verificado con `npm run db:check`):** las dos últimas migraciones **están escritas pero pendientes de aplicarse**. Ver §7.

## 1. Diagrama de relaciones

```
usuarios (staff: admin, asesor, disenador)

clientes ── 1:N ── citas
   │
   └── (eliminada relación directa con proyectos)

proyectos (ahora independientes de clientes)
   │
   ├── 1:N ── productos (orden)
   │             │
   │             └── 1:N ── propuestas_3d (video_global_url, frame_centro_ms, estado, link_token, publicada_portafolio)
   │                          │
   │                          └── 1:N ── propuestas_3d_animaciones (tipo, segundo_inicio_ms, duracion_ms, video_accion_url)
   │
   └── 1:N ── proyectos_fotos (galería del portafolio, orden)

cotizaciones ── N:1 ── proyectos
cotizaciones ── N:1 ── clientes
cotizaciones ── 1:N ── cotizacion_productos (productos derivados, manipulables)
cotizacion_productos ── 1:N ── cotizacion_propuestas (propuestas derivadas, manipulables)

modalidades_cita ── 1:N ── citas (modalidad_id)
visores_landing ── 1:N ── visores_landing_animaciones
```

`visores_landing` no cuelga de `propuestas_3d`: es un **espejo** de esa tabla para que
`VideoViewer` consuma los visores de la landing sin adaptaciones.

---

## 2. Entidades del Sistema

### 2.1 `usuarios`
Personal interno de la carpintería con acceso al panel de staff (`/staff`).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `nombre` | TEXT | NOT NULL | Nombre y apellidos |
| `email` | TEXT | NOT NULL, UNIQUE | Correo electrónico de inicio de sesión |
| `rol` | TEXT | NOT NULL, CHECK in (`admin`, `asesor`, `disenador`) | Rol y nivel de permisos |
| `password_hash` | TEXT | NULL | Hash scrypt de la contraseña |
| `foto_perfil` | TEXT | NULL | URL de imagen de perfil |
| `bio_publica` | TEXT | NULL | Breve descripción pública |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | Estado de la cuenta (inactivos no pueden loguear) |
| `creado_en` / `actualizado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Tabla preservada de un schema anterior; los nombres de timestamp difieren de las tablas nuevas |

---

### 2.2 `clientes`
Clientes que agendan citas o para quienes se ejecutan proyectos.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `nombre` | TEXT | NOT NULL | Nombre completo o razón social |
| `email` | TEXT | **NULLABLE** | Correo de contacto principal. La migración `20260924000000` hace `DROP NOT NULL` si el schema heredado lo tenía obligatorio |
| `telefono` | TEXT | NULL | Teléfono / WhatsApp. Índice único parcial `clientes_telefono_unq` sobre los valores no nulos ni vacíos |
| `fase` | TEXT | NOT NULL, CHECK in (`descubrimiento`, `evaluacion`, `implementacion`, `egresado`) | Etapa comercial del cliente |
| `info_personal` | JSONB | NULL | Metadatos y notas flexibles |
| `descripcion_proyecto` | TEXT | NULL | Resumen del requerimiento inicial |
| `creado_en` / `actualizado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

El índice único por teléfono es lo que permite reutilizar el mismo cliente entre varias
reservas sin duplicarlo.

---

### 2.3 `citas`
Reservas de tiempo en la agenda comercial o técnica.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `cliente_id` | UUID | FK → `clientes(id)` ON DELETE SET NULL | Cliente asociado (nullable) |
| `nombre_solicitante` | TEXT | NULL | Nombre del solicitante |
| `email` | TEXT | NULL | Correo de contacto |
| `telefono` | TEXT | NULL | Teléfono de contacto |
| `descripcion` | TEXT | NULL | Notas o motivo de la reunión |
| `fecha_hora` | TIMESTAMPTZ | NOT NULL | Inicio de la cita |
| `duracion_minutos` | INTEGER | NOT NULL, DEFAULT 120 | Duración en minutos. La agenda la sobreescribe con `modalidades_cita.duracion_minutos` |
| `estado` | TEXT | NOT NULL, DEFAULT `en_espera` | Estado operativo de la cita |
| `origen` | TEXT | NOT NULL, DEFAULT `web` | Canal de procedencia (`web` / `interna`) |
| `movida` | BOOLEAN | NOT NULL, DEFAULT false | Indica si la cita fue reprogramada |
| `fecha_hora_anterior` | TIMESTAMPTZ | NULL | Fecha previa en caso de reprogramación |
| `meet_link` | TEXT | NULL | Enlace de videollamada (Google Meet) |
| `notas` | TEXT | NULL | Comentarios internos de staff |
| `ip` | TEXT | NULL | Dirección IP del solicitante web |
| `modalidad_id` | UUID | FK → `modalidades_cita(id)` ON DELETE SET NULL | **Modalidad reservada** (nullable). El slot se ocupa por modalidad: una cita virtual no bloquea un bloque presencial. Índice `citas_modalidad_fecha_idx (modalidad_id, fecha_hora)` |
| `precio_copiado` | INTEGER | NOT NULL, DEFAULT 0 | **Costo de la modalidad en el momento de la reserva.** El precio nunca lo envía el cliente |
| `direccion` | TEXT | NULL | Dirección de la visita presencial. Nullable: se acuerda por WhatsApp. La rellena staff desde `/staff/gestion/citas` (máx. 400 caracteres según `citaStaffSchema`) |
| `creado_en` / `actualizado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

Notas:

- `nombre_solicitante` y `email` son **nullable** en el esquema y en `lib/supabase/types.ts`
  (la tabla `cites` original era más laxa de lo que asumía la documentación anterior a la
  migración `20260923000000`).
- `estado` no tiene CHECK en el esquema; los valores válidos los fija la aplicación
  (`en_espera`, `aceptada`, `cancelada`). La regla de qué estado ocupa un bloque y qué implica
  confirmar está en `docs/01_reglas_negocio.md` §3 (no hay cambios de esquema: es lógica de
  servicio).
- Los tres campos nuevos (`modalidad_id`, `precio_copiado`, `direccion`) los añade
  `supabase/migrations/20260924000000_espacio_publico.sql`, que **aún no está aplicada**.

---

### 2.4 `modalidades_cita`
Catálogo cerrado de las opciones de la agenda pública. Es **contenido editorial de la BD**, no
un asset del repo: `app/agenda/modalidad/page.tsx` lo lee en cada request.

> Esta tabla **no tiene DDL en `supabase/migrations/`**: fue preservada de un schema anterior
> (`20260919000000_init_clean_schema.sql` solo garantiza timestamps de `clientes`). El esquema
> que usa el código es el que resulta de `20260924000000_espacio_publico.sql`.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `nombre` | TEXT | NOT NULL | Nombre visible ("Virtual", "Presencial") |
| `slug` | TEXT | NULL, UNIQUE (parcial) | Identificador de URL y de query param: `virtual`, `presencial`. Índice único `modalidades_cita_slug_unq WHERE slug IS NOT NULL` |
| `descripcion` | TEXT | NULL | Copy de una línea que se muestra en la tarjeta |
| `costo` | NUMERIC | NOT NULL, DEFAULT 0 | **Costo de la modalidad.** Fuente de verdad del precio; nunca lo envía el cliente |
| `duracion_minutos` | INTEGER | NOT NULL, DEFAULT 120 | Duración del bloque. Se copia a `citas.duracion_minutos` |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | Visible en la agenda pública |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Posición de presentación |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

Filas sembradas por la migración:

| slug | nombre | descripcion | costo | duracion_minutos | orden |
|---|---|---|---|---|---|
| `virtual` | Virtual | Videollamada con tu diseñador. Sin costo. | 0 | 90 | 0 |
| `presencial` | Presencial | Visita a tu domicilio y toma de medidas. | 70000 | 90 | 1 |

El backfill de `slug` de la migración es heurístico (`%virtual%`/`%online%` → `virtual`;
`%presencial%`/`%taller%`/`%medidas%` → `presencial`). El `INSERT ... ON CONFLICT DO NOTHING`
no crea las filas si la tabla ya tenía 2 modalidades con esos nombres, así que **el catálogo
puede quedar sin el copy de la migración** si la BD real ya traía filas. `app/agenda/modalidad/page.tsx`
exige exactamente 2 modalidades activas y, si no, muestra "La agenda está en mantenimiento" en
lugar de un flujo roto.

---

### 2.5 `proyectos`
Unidad principal de trabajo y portfolio. Los proyectos de diseño son independientes de
clientes; la conexión se realiza a través de cotizaciones.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `cliente_id` | UUID | FK → `clientes(id)` ON DELETE RESTRICT, **nullable** | Creado `NOT NULL` en `20260919000000` y cambiado a nullable por `20260922000001_cotizaciones_derivadas.sql` (`DROP NOT NULL`) |
| `titulo` | TEXT | NOT NULL | Título del proyecto (ej. "Casa Santorini") |
| `slug` | TEXT | NOT NULL, UNIQUE | Identificador URL-friendly (generado por trigger) |
| `descripcion` | TEXT | NULL | Memoria descriptiva del proyecto |
| `asignado_a` | UUID | FK → `usuarios(id)` ON DELETE SET NULL | Diseñador staff asignado |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Posición en el listado |
| `publicado` | BOOLEAN | NOT NULL, DEFAULT false | Visibilidad en el portafolio público |
| `sede` | ENUM `sede_taller` | NOT NULL, DEFAULT `santa_marta` | **Rama del portafolio en la que se publica.** `bogota` es histórico: la sede ya no existe y solo aporta fotos. Índices `proyectos_sede_publicado_idx (sede, publicado)` |
| `categoria` | ENUM `categoria_mueble` | NULL, sin default | **Categoría de mueble, un solo valor por proyecto.** Nullable: los proyectos existentes salen como "Sin categoría" hasta que staff asigne una. Índice `proyectos_categoria_idx` |
| `portada_url` | TEXT | NULL | **Imagen de portada a sangre** de la página pública del proyecto. Si es nulo, la tarjeta usa `FALLBACK_PORTADA` (`/tonfort-closet-render.png`) |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

Índices relevantes: `proyectos_recientes_idx (publicado, created_at DESC)` alimenta
`ProyectosRecientes` en la landing.

Enums:

| Enum | Valores |
|---|---|
| `sede_taller` | `santa_marta`, `bogota` |
| `categoria_mueble` | `cocina`, `closet`, `mueble_tv`, `puerta`, `iluminacion`, `espacio_integral`, `otro` |

Espejo en TypeScript: `SedeTaller`, `CategoriaMueble`, `SEDES`, `CATEGORIAS_MUEBLE`,
`ETIQUETA_SEDE`, `ETIQUETA_CATEGORIA` y `SLUG_SEDE` (`santa_marta` → `santa-marta`, usado en la
URL) en `lib/supabase/types.ts`. El array literal que usa Zod es `CATEGORIAS_MUEBLE_SCHEMA` en
`lib/validators.ts`; `lib/categorias.ts` añade el copy de una línea y el type guard
`esCategoriaMueble()` para los query params, y falla en tiempo de carga si se desincroniza con
`CATEGORIAS_MUEBLE`.

---

### 2.6 `proyectos_fotos`
Galería de fotos del proyecto en la página pública plana del portafolio. La añade
`20260924000000_espacio_publico.sql`.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `proyecto_id` | UUID | NOT NULL, FK → `proyectos(id)` ON DELETE CASCADE | Proyecto contenedor |
| `url` | TEXT | NOT NULL | URL pública en el bucket `portafolio-imagenes` |
| `alt` | TEXT | NULL | Texto alternativo (máx. 200 caracteres en la API) |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Posición en la galería. El `POST` calcula `max(orden) + 1` para que la foto nueva quede siempre al final |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |

Índice `proyectos_fotos_proyecto_idx (proyecto_id, orden)`. No tiene `updated_at` ni trigger de
timestamp. RLS: `anon_read_proyectos_fotos` solo deja leer fotos de proyectos con
`publicado = true`; `service_role_full_access_proyectos_fotos` da acceso total al service role.

---

### 2.7 `productos`
Muebles o espacios individuales dentro de un proyecto.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `proyecto_id` | UUID | FK → `proyectos(id)` ON DELETE CASCADE | Proyecto contenedor |
| `titulo` | TEXT | NOT NULL | Nombre del mueble (ej. "Cocina Isla", "Vestidor Principal"). La documentación anterior a la Ola 2 lo llamaba `nombre`: es `titulo` tanto en el SQL como en `lib/supabase/types.ts` |
| `descripcion` | TEXT | NULL | Especificaciones del producto |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Posición de presentación |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

---

### 2.8 `propuestas_3d`
Alternativas de diseño en video interactivo para un producto.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `producto_id` | UUID | FK → `productos(id)` ON DELETE CASCADE | Producto al que pertenece |
| `titulo` | TEXT | NOT NULL | Nombre de la opción (ej. "Opción Roble & Cuarzo") |
| `descripcion` | TEXT | NULL | Acabados, iluminación y notas de diseño |
| `video_global_url` | TEXT | NULL | Video principal en barrido continuo (`visores-video`) |
| `frame_centro_ms` | INTEGER | NULL | Marca de tiempo (ms) para vista frontal de reposo |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Orden de visualización |
| `estado` | ENUM `estado_propuesta_3d` | NOT NULL, DEFAULT `borrador` | Estado del ciclo de vida: `borrador` → `lista` → `enviada` (secuencia estricta, con triggers que la vigilan) |
| `link_token` | TEXT | NULL, UNIQUE | Token seguro de 32 bytes para enlace privado cliente |
| `link_activo` | BOOLEAN | NOT NULL, DEFAULT false | Habilita acceso por `/propuestas/[token]` |
| `publicada_portafolio` | BOOLEAN | NOT NULL, DEFAULT false | Publicada en el portafolio público |
| `precio_cotizacion` | NUMERIC(10,2) | NULL | Precio asignado dentro de la cotización |
| `seleccionada_por_cliente` | BOOLEAN | DEFAULT false | El cliente la marcó como seleccionada |
| `cotizacion_id` | UUID | FK → `cotizaciones(id)` ON DELETE SET NULL | Cotización a la que pertenece |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

---

### 2.9 `propuestas_3d_animaciones`
Animación independiente por botón inferior: un clip de **movimiento** obligatorio y uno de
**acción** opcional, con velocidades de reproducción propias.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `propuesta_id` | UUID | FK → `propuestas_3d(id)` ON DELETE CASCADE | Propuesta a la que pertenece |
| `titulo` | TEXT | NOT NULL | Título de la animación (ej. "Detalle iluminación gola") |
| `descripcion` | TEXT | NULL | Descripción corta |
| `video_movimiento_url` | TEXT | NOT NULL | Video de movimiento (bucket `visores-video`, máx. 50 MB) |
| `video_accion_url` | TEXT | NULL | Video de acción opcional (bucket `visores-video`, máx. 50 MB) |
| `velocidad_normal` | NUMERIC | NOT NULL, DEFAULT 1, CHECK > 0 | Multiplicador de reproducción del movimiento |
| `velocidad_inversa` | NUMERIC | NOT NULL, DEFAULT 2, CHECK > 0 | Multiplicador de la reversa al volver al centro |
| `seleccionada` | BOOLEAN | NOT NULL, DEFAULT false | Añadida por `20260921000002_animacion_seleccionada.sql` |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Orden de listado |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps |

Índices: `propuestas_3d_animaciones_propuesta_id_idx` y `propuestas_3d_animaciones_orden_idx
(propuesta_id, orden)`.

---

### 2.10 `visores_landing`
Visores 3D públicos de la landing. Espejo de `propuestas_3d` para que `VideoViewer` los
consuma sin adaptaciones. La añade `20260924000000_espacio_publico.sql`.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `slot` | TEXT | NULL | **Legacy.** `20260925000000_visores_carrusel.sql` quita el `NOT NULL`, el `CHECK` y el índice único `visores_landing_slot_unq`: el carrusel no usa slots. Las filas viejas conservan su valor |
| `eyebrow` | TEXT | NULL | Antetítulo sobre el visor |
| `titulo` | TEXT | NOT NULL | Título visible |
| `descripcion` | TEXT | NULL | Párrafo de apoyo |
| `video_global_url` | TEXT | NOT NULL | Video principal (bucket `visores-video`) |
| `frame_centro_ms` | INTEGER | NOT NULL, DEFAULT 0 | Posición canónica de reposo |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | El `GET` público solo devuelve los activos |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Orden de presentación en el carrusel. Índice `visores_landing_orden_idx` |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps, con trigger `_tonfort_touch_updated_at()` |

RLS: `service_role_full_access_visores_landing` (todo el acceso es server-side; el navegador
nunca lee la tabla directamente).

**La tabla nace vacía.** La migración solo hace `INSERT` en `modalidades_cita`, no siembra filas
de visor. Como `app/page.tsx` solo monta `VisoresCarousel` cuando hay visores activos con video,
**aplicar la migración deja la landing sin la sección de presentación de diseños** hasta que el
admin cree el primero en `/staff/administracion/visores`. Es el comportamiento previsto, no una
rotura.

Desde `20260925000000_visores_carrusel.sql` la tabla es una lista, no un par de slots: el editor
crea, reordena, activa y elimina visores, y todas las rutas de la API van por `[id]`, no por
`[slot]`.

---

### 2.11 `visores_landing_animaciones`
Clips de interacción de cada visor de la landing. Espejo de `propuestas_3d_animaciones` pero
**sin `tipo` ni marca de tiempo**: el visor reproduce los clips en la secuencia que le da el
cliente.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `visor_id` | UUID | NOT NULL, FK → `visores_landing(id)` ON DELETE CASCADE | Visor al que pertenece |
| `titulo` | TEXT | NOT NULL | Título de la animación |
| `descripcion` | TEXT | NULL | Descripción corta |
| `video_movimiento_url` | TEXT | NOT NULL | Clip de movimiento |
| `video_accion_url` | TEXT | NULL | Clip de acción (opcional) |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Orden de secuencia |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamps, con trigger |

Índice `visores_landing_animaciones_idx (visor_id, orden)`.

---

## 3. Triggers y Funciones de Base de Datos

Definidos en `supabase/migrations/20260919000001_triggers_and_functions.sql`:

1. **`set_updated_at`** / **`_tonfort_touch_updated_at`**: actualizan automáticamente `updated_at` o `actualizado_en` antes de cada `UPDATE`.
2. **`trigger_proyectos_slug`**: si el `slug` viene nulo o vacío, genera un slug canónico a partir de `titulo` aplicando unaccent y normalización con sufijo numérico en caso de colisión.
3. **`trg_valida_propuesta_transicion`**: en `propuestas_3d`, impide pasar de `borrador` a `lista` o `enviada` si `video_global_url` o `frame_centro_ms` son nulos.
4. **`trg_valida_link_privado`**: en `propuestas_3d`, impide marcar `link_activo = true` si faltan `video_global_url` o `frame_centro_ms`.
5. **`trg_valida_publicada_portafolio`**: en `propuestas_3d`, impide `publicada_portafolio = true` a menos que la propuesta esté en `estado = 'enviada'`.

`20260924000000_espacio_publico.sql` añade dos triggers más sobre `visores_landing` y
`visores_landing_animaciones` que reutilizan `_tonfort_touch_updated_at()`.

---

## 4. Almacenamiento (Supabase Storage)

### `visores-video` (público para lectura vía CDN / Storage URL)
- **Límites de tamaño**:
  - Video global (`video_global_url`): máximo 100 MB.
  - Video animación (`video_accion_url`): máximo 50 MB.
- **MIME types permitidos**: `video/mp4`, `video/webm`, `video/quicktime` (.mov).
- **Convención de rutas en Storage**:
  - `proyectos/{proyectoId}/productos/{productoId}/propuestas/{propuestaId}/global-{timestamp}.{ext}`
  - `proyectos/{proyectoId}/productos/{productoId}/propuestas/{propuestaId}/animaciones/{animacionId}-{timestamp}.{ext}`

### `portafolio-imagenes` (público)
Lo crea la propia migración `20260924000000_espacio_publico.sql` y lo asegura en cada subida
`ensurePortafolioImagenesBucket()`. Políticas: `anon_read_portafolio_imagenes` (SELECT público) y
`service_role_full_access_portafolio_imagenes` (todo para el service role).

- **Contenido**: fotos de `proyectos_fotos` y `proyectos.portada_url`.
- **Validación**: `validateImageUpload(file)` de `lib/storage.ts` comprueba MIME contra
  `IMAGEN_MIME_TYPES` y tamaño contra `IMAGEN_MAX_SIZE`; devuelve `422` en la API.
- **Convención de rutas**: carpeta por proyecto (`uploadPortafolioImagen(supabase, file, proyectoId)`).

---

## 5. Módulos de Cotización

### 5.1 Cotizaciones independientes (Opción A)

**Cambios estructurales:**
- `proyectos.cliente_id` ahora es nullable (proyectos independientes de clientes)
- Cotizaciones conectan proyectos y clientes: `cotizaciones.proyecto_id` + `cotizaciones.cliente_id`
- Tablas derivadas para manipulación libre:
  - `cotizacion_productos` - copias manipulables de productos
  - `cotizacion_propuestas` - copias manipulables de propuestas

**Flujo:**
1. Se crea cotización seleccionando proyecto y cliente
2. Sistema copia automáticamente productos del proyecto a `cotizacion_productos`
3. Sistema copia automáticamente propuestas a `cotizacion_propuestas`
4. Staff puede eliminar/alterar productos y propuestas de la cotización sin afectar al proyecto original
5. Un mismo proyecto puede usarse en múltiples cotizaciones para diferentes clientes

**Migraciones activas:** `supabase/migrations/20260922000000_cotizaciones.sql`,
`supabase/migrations/20260922000001_cotizaciones_derivadas.sql`.

### 5.2 Módulo histórico de corte

El módulo histórico de costeo técnico (`cotizacion/` en la raíz — herramienta standalone
pendiente de extraer a repo independiente — y las 15 tablas legacy `portafolio_proyectos`,
`propuestas_diseno`, `hotspots`, `modelos`, `modelo_materiales`, `materiales`,
`cotizacionversiones`, `cotizaciones_generadas`, `propuesta_modelos`, `producto_versiones`,
`producto_version_modelos`, `producto_version_materiales`, `cotizacion_items`,
`cotizacion_costos_variables` y `cotizacion_timelines`, todas **verificadas como eliminadas**
por `npm run db:check`) permanece aislado y no interviene en el flujo activo de propuestas en
video. Sus Route Handlers (`app/api/cotizaciones/**` salvo `link/[token]`, `app/api/materiales/**`,
`app/api/proyectos/**`) están archivados y responden `404` o lista vacía.

---

## 6. Inventario de migraciones

| Archivo | Qué hace |
|---|---|
| `20260919000000_init_clean_schema.sql` | DDL de `citas`, `proyectos`, `productos`, `propuestas_3d`, `propuestas_3d_animaciones`; garantiza timestamps de `clientes`; elimina 15 tablas legacy |
| `20260919000001_triggers_and_functions.sql` | `updated_at`, slug de proyectos y validaciones de transición de propuesta |
| `20260921000002_animacion_seleccionada.sql` | `propuestas_3d_animaciones.seleccionada` |
| `20260922000000_cotizaciones.sql` | `cotizaciones` y columnas de conexión en `propuestas_3d` |
| `20260922000001_cotizaciones_derivadas.sql` | `cotizacion_productos` / `cotizacion_propuestas`; `proyectos.cliente_id` pasa a nullable |
| `20260923000000_fix_citas_table_name.sql` | Renombra `cites` → `citas` si el nombre bueno no existe |
| `20260924000000_espacio_publico.sql` | Espacio público: modalidades, `citas` (modalidad/precio/dirección), `clientes`, `proyectos` (sede/categoría/portada), `proyectos_fotos`, `visores_landing(+_animaciones)`, bucket `portafolio-imagenes`, RLS y triggers |
| `20260925000000_visores_carrusel.sql` | `visores_landing` pasa de 2 slots a N visores: quita el `CHECK` de `slot`, su `NOT NULL` y `visores_landing_slot_unq`, e indexa `orden`. Idempotente |

---

## 7. Estado real del esquema y discrepancias conocidas

### 7.1 Migraciones escritas pero **no aplicadas**

`npm run db:check` (que consulta la BD real con `service_role`) a fecha de hoy devuelve: las 11
tablas existen y tienen datos (`citas` 49 filas, `visores_landing` 0).

Origen histórico del fallo de `citas`: la tabla se creó con el typo `cites` y la migración
`20260923000000_fix_citas_table_name.sql`, que la renombra, se aplicó tarde. Las dos migraciones
(`20260923000000` → `20260924000000`) se aplicaron **fuera de orden** respecto al repo y hoy la BD
ya está al día con ellas: ninguna usa `IF NOT EXISTS` / `DROP ... IF EXISTS` de más, así que
volver a correrlas es inocuo.

**La única migración del repo que sigue sin aplicar es `20260925000000_visores_carrusel.sql`.**
La BD conserva el esquema antiguo de dos visores: `slot` NOT NULL sin default, el índice único
`visores_landing_slot_unq` y el CHECK que solo admite `'primero'`/`'segundo'`. Mientras no se
aplique, `POST /api/staff/administracion/visores-landing` responde **409** con el nombre de la
migración en `migracionPendiente` (el editor lo muestra en un toast), porque con ese esquema el
carrusel no puede pasar de dos filas.

Para aplicarla, en el SQL editor de Supabase:

```sql
DO $$
DECLARE nombre_check TEXT;
BEGIN
  SELECT conname INTO nombre_check
  FROM pg_constraint
  WHERE conrelid = 'visores_landing'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%slot%';
  IF nombre_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE visores_landing DROP CONSTRAINT %I', nombre_check);
  END IF;
END $$;

DROP INDEX IF EXISTS visores_landing_slot_unq;
ALTER TABLE visores_landing ALTER COLUMN slot DROP NOT NULL;
CREATE INDEX IF NOT EXISTS visores_landing_orden_idx ON visores_landing(orden);
```

Es idempotente: se puede ejecutar dos veces sin efecto.

### 7.2 `lib/supabase/types.ts` vs migraciones

`lib/supabase/types.ts` es un espejo declarado a mano del esquema, no un tipo generado. Hay
discrepancias conocidas:

| Discrepancia | `lib/supabase/types.ts` | SQL |
|---|---|---|
| Nullability de `citas.nombre_solicitante` / `email` | `string \| null` | nullable en el DDL — **coinciden**; la documentación anterior a la Ola 2 los daba por NOT NULL y era incorrecto |
| `modalidades_cita` | `ModalidadCita` con `slug`, `descripcion`, `orden` | Sin DDL en las migraciones (tabla preservada); el espejo refleja lo que la migración `20260924000000` espera encontrar |
| `proyectos.cliente_id` | `string \| null` | `NOT NULL` en `20260919000000`, nullable tras `20260922000001` — **coinciden** en el estado final |
| Tipo de `propuestas_3d.estado` | `EstadoPropuesta3D` (union de literales) | ENUM `estado_propuesta_3d` — equivalentes en valores, no en tipo |
| Nombres de timestamp | `usuarios` y `clientes` usan `creado_en`/`actualizado_en`; `proyectos` y siguientes usan `created_at`/`updated_at` | Coinciden: es la mezcla real del schema, no un error de tipos |
| `Producto.titulo` | `titulo` | `titulo` — **coinciden**. Coinciden. La documentación anterior a la Ola 2 usaba `nombre`, que no existe en el esquema; ya está corregido aquí |

`lib/supabase/types.ts` **no** es un tipo generado de Supabase: nadie lo regenera al aplicar una
migración. Cuando se aplique `20260924000000`, los tipos `Proyecto`, `ProyectoFoto`,
`VisorLanding`, `ModalidadCita` y los tres campos nuevos de `Cita` dejan de ser "espejo" y
pasan a reflejar el esquema real. La fuente de verdad sigue siendo el SQL de
`supabase/migrations/`; ante cualquier duda, mandar el SQL.
