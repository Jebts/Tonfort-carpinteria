# Tonfort — Modelo de datos

Este documento detalla cada entidad, sus campos, relaciones, triggers y políticas de seguridad (RLS). La fuente de verdad técnica es el esquema SQL en `supabase/migrations/20260919000000_init_clean_schema.sql`, `supabase/migrations/20260919000001_triggers_and_functions.sql` y los tipos TypeScript en `lib/supabase/types.ts`.

## 1. Diagrama de relaciones

```
usuarios (staff: admin, asesor, disenador)

clientes ── 1:N ── citas
   │
   └── (eliminada relación directa con proyectos)

proyectos (ahora independientes de clientes)
   │
   └── 1:N ── productos (orden)
                │
                └── 1:N ── propuestas_3d (video_global_url, frame_centro_ms, estado, link_token, publicada_portafolio)
                     │
                     └── 1:N ── propuestas_3d_animaciones (tipo, segundo_inicio_ms, duracion_ms, video_accion_url)

cotizaciones ── N:1 ── proyectos
cotizaciones ── N:1 ── clientes
cotizaciones ── 1:N ── cotizacion_productos (productos derivados, manipulables)
cotizacion_productos ── 1:N ── cotizacion_propuestas (propuestas derivadas, manipulables)

modalidades_cita (agenda pública)
```

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
| `bio_publica` | TEXT | NULL | Breve descripción pública para el agendador de citas |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | Estado de la cuenta (inactivos no pueden loguear) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.2 `clientes`
Clientes que agendan citas o para quienes se ejecutan proyectos.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `nombre` | TEXT | NOT NULL | Nombre completo o razón social |
| `email` | TEXT | NOT NULL | Correo de contacto principal |
| `telefono` | TEXT | NULL | Teléfono / WhatsApp |
| `fase` | TEXT | NOT NULL, CHECK in (`descubrimiento`, `evaluacion`, `implementacion`, `egresado`) | Etapa comercial del cliente |
| `info_personal` | JSONB | NULL | Metadatos y notas flexibles |
| `descripcion_proyecto` | TEXT | NULL | Resumen del requerimiento inicial |
| `creado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `actualizado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.3 `citas`
Reservas de tiempo en la agenda comercial o técnica.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `cliente_id` | UUID | FK → `clientes(id)` ON DELETE SET NULL | Cliente asociado (nullable) |
| `nombre_solicitante` | TEXT | NOT NULL | Nombre del solicitante |
| `email` | TEXT | NOT NULL | Correo de contacto |
| `telefono` | TEXT | NULL | Teléfono de contacto |
| `descripcion` | TEXT | NULL | Notas o motivo de la reunión |
| `fecha_hora` | TIMESTAMPTZ | NOT NULL | Inicio de la cita (bloques de 2 horas) |
| `duracion_minutos` | INTEGER | NOT NULL, DEFAULT 120 | Duración en minutos |
| `estado` | TEXT | NOT NULL, CHECK in (`en_espera`, `aceptada`, `cancelada`) | Estado operativo de la cita |
| `origen` | TEXT | NOT NULL, CHECK in (`web`, `interna`) | Canal de procedencia |
| `movida` | BOOLEAN | NOT NULL, DEFAULT false | Indica si la cita fue reprogramada |
| `fecha_hora_anterior` | TIMESTAMPTZ | NULL | Fecha previa en caso de reprogramación |
| `meet_link` | TEXT | NULL | Enlace de videollamada (Google Meet) |
| `notas` | TEXT | NULL | Comentarios internos de staff |
| `ip` | TEXT | NULL | Dirección IP del solicitante web |
| `creado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `actualizado_en` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.4 `modalidades_cita`
Catálogo de opciones para la agenda pública de citas.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `nombre` | TEXT | NOT NULL | Nombre (ej. "Asesoría de diseño", "Visita técnica") |
| `costo` | NUMERIC | NOT NULL, DEFAULT 0 | Costo de la modalidad (0 = gratuita) |
| `duracion_minutos` | INTEGER | NOT NULL, DEFAULT 120 | Duración del bloque |
| `activo` | BOOLEAN | NOT NULL, DEFAULT true | Visible en agenda pública |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.5 `proyectos`
Unidad principal de trabajo y portfolio. Los proyectos de diseño son independientes de clientes; la conexión se realiza a través de cotizaciones.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `cliente_id` | UUID | FK → `clientes(id)` ON DELETE SET NULL | Cliente asociado (nullable). Los proyectos de diseño se crean sin cliente; la conexión se realiza mediante cotizaciones. |
| `titulo` | TEXT | NOT NULL | Título del proyecto (ej. "Casa Santorini") |
| `slug` | TEXT | NOT NULL, UNIQUE | Identificador URL-friendly (generado por trigger) |
| `descripcion` | TEXT | NULL | Memoria descriptiva del proyecto |
| `publicado` | BOOLEAN | NOT NULL, DEFAULT false | Visibilidad en el portafolio público (`/portafolio`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.6 `productos`
Muebles o espacios individuales dentro de un proyecto.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `proyecto_id` | UUID | FK → `proyectos(id)` ON DELETE CASCADE | Proyecto contenedor |
| `nombre` | TEXT | NOT NULL | Nombre del mueble (ej. "Cocina Isla", "Vestidor Principal") |
| `descripcion` | TEXT | NULL | Especificaciones del producto |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Posición de presentación |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.7 `propuestas_3d`
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
| `estado` | TEXT | NOT NULL, DEFAULT 'borrador', CHECK in (`borrador`, `lista`, `enviada`) | Estado del ciclo de vida |
| `link_token` | TEXT | NULL, UNIQUE | Token seguro de 32 bytes para enlace privado cliente |
| `link_activo` | BOOLEAN | NOT NULL, DEFAULT false | Habilita acceso por `/propuestas/[token]` |
| `publicada_portafolio` | BOOLEAN | NOT NULL, DEFAULT false | Publicada en el portafolio público |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

### 2.8 `propuestas_3d_animaciones`
Clips de video interactivos complementarios para una propuesta.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | Identificador único |
| `propuesta_id` | UUID | FK → `propuestas_3d(id)` ON DELETE CASCADE | Propuesta a la que pertenece |
| `titulo` | TEXT | NOT NULL | Título de la animación (ej. "Detalle iluminación gola") |
| `tipo` | TEXT | NOT NULL, CHECK in (`zoom`, `interaccion`) | Clasificación del clip |
| `segundo_inicio_ms` | INTEGER | NOT NULL, CHECK >= 0 | Punto en el video global donde ocurre la interacción |
| `duracion_ms` | INTEGER | NOT NULL, CHECK > 0 | Duración en milisegundos |
| `video_accion_url` | TEXT | NOT NULL | URL del clip de video en bucket `visores-video` |
| `orden` | INTEGER | NOT NULL, DEFAULT 0 | Orden de listado |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Fecha de última actualización |

---

## 3. Triggers y Funciones de Base de Datos

Definidos en `supabase/migrations/20260919000001_triggers_and_functions.sql`:

1. **`set_updated_at`**: Actualiza automáticamente `updated_at` o `actualizado_en` antes de cada `UPDATE` en todas las tablas.
2. **`trigger_proyectos_slug`**: Si el `slug` viene nulo o vacío, genera un slug canónico a partir de `titulo` aplicando unaccent y normalización con sufijo numérico en caso de colisión.
3. **`trg_valida_propuesta_transicion`**: En `propuestas_3d`, impide pasar de `borrador` a `lista` o `enviada` si `video_global_url` es nulo o `frame_centro_ms` es nulo.
4. **`trg_valida_link_privado`**: En `propuestas_3d`, impide marcar `link_activo = true` si faltan `video_global_url` o `frame_centro_ms`.
5. **`trg_valida_publicada_portafolio`**: En `propuestas_3d`, impide marcar `publicada_portafolio = true` a menos que la propuesta esté en `estado = 'enviada'`.

---

## 4. Almacenamiento (Supabase Storage)

- **Bucket**: `visores-video` (público para lectura vía CDN / Storage URL).
- **Límites de tamaño**:
  - Video global (`video_global_url`): máximo 100 MB.
  - Video animación (`video_accion_url`): máximo 50 MB.
- **MIME types permitidos**: `video/mp4`, `video/webm`, `video/quicktime` (.mov).
- **Convención de rutas en Storage**:
  - `proyectos/{proyectoId}/productos/{productoId}/propuestas/{propuestaId}/global-{timestamp}.{ext}`
  - `proyectos/{proyectoId}/productos/{productoId}/propuestas/{propuestaId}/animaciones/{animacionId}-{timestamp}.{ext}`

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
4. Staff puede eliminar/alterar productos y propuestas de la cotización sin afectar el proyecto original
5. Un mismo proyecto puede usarse en múltiples cotizaciones para diferentes clientes

**Migración activa:** `supabase/migrations/20260922000001_cotizaciones_derivadas.sql`

### 5.2 Módulo histórico de corte

El módulo histórico de costeo técnico (`cotizacion/` y tablas legacy como `modelos`, `materiales`,
`cotizacionversiones` y `cotizaciones_generadas`) permanece aislado y no interviene en el flujo activo
de propuestas en video.
