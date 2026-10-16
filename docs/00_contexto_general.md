# Tonfort — Contexto general y glosario

## 1. Qué es Tonfort

Tonfort es una carpintería artesanal de melamina con aplicación de iluminación, ubicada en
Santa Marta, Colombia. Diseña y construye muebles a medida (cocinas, closets, muebles de TV,
puertas y espacios integrales) con integración de iluminación LED.

El sistema implementa una **plataforma de presentación interactiva basada en video** (video-only):

1. **Diseño y Render**: El equipo modela en Blender el mobiliario con iluminación horneada (baking)
   y exporta videos de alta calidad: un video global continuo en barrido y animaciones de detalle o
   interacción funcional (apertura de cajones, encendido de luces LED, etc.).
2. **Propuestas en Video**: En el panel de staff, se sube el video global (con bucle suave y
   punto de reposo `frame_centro_ms`) y se configuran animaciones secundarias (`propuestas_3d_animaciones`).
   El visor interactivo (`VideoViewer`) permite al usuario pausar, volver al centro o reproducir
   animaciones específicas.
3. **Distribución segura y Portafolio**: El staff puede generar un enlace privado único y no
   predecible (`/propuestas/[token]`) para enviar al cliente, y los administradores pueden publicar
   propuestas destacadas directamente al portafolio público (`/portafolio`).

> **Nota sobre Cotizaciones:**
> El flujo activo de cotizaciones agrupa propuestas de un proyecto para un cliente mediante la
> tabla `cotizaciones`. Cada propuesta asociada conserva su video interactivo y puede tener un
> `precio_cotizacion` y una `seleccionada_por_cliente`; el cliente la consulta con un token público
> en `/cotizaciones/[token]`. El módulo histórico de costeo técnico en `cotizacion/` permanece
> aislado y no forma parte de este flujo activo.

### Características actuales (código real)

- **Landing pública** — servicios, portafolio de proyectos, historia, contacto.
- **Portafolio público** — `/portafolio` muestra una sola página con las dos listas: Santa Marta arriba y Bogotá abajo, con filtro por categoría; `/portafolio/[sede]/[slug]` muestra la **ficha plana** de cada proyecto: portada a sangre, galería de fotos (`proyectos_fotos`) y, solo en Santa Marta, un visor de video sincronizado (`VideoViewer`) con la primera propuesta publicada.
- **Enlace privado de propuesta** — `/propuestas/[token]` accesible sin login con token criptográfico seguro.
- **Agenda pública de citas** — reserva en 2 pasos (modalidad → horario) con la duración y el costo de cada modalidad (`modalidades_cita.duracion_minutos` y `.costo`).
- **Panel de staff** — gestión de proyectos, clientes, agenda de citas, usuarios y taller de diseño de propuestas.
- **Asistente de IA** para redacción de portafolio (LLM configurable: mock/groq/openai).
- **Auth de staff** vía HMAC cookie (`SESSION_SECRET`) con credenciales en BD (tabla `usuarios`, scrypt).
- **Middleware** `proxy.ts` protege `/staff/*` y `/api/staff/*`.

## 2. Glosario de términos

| Término | Definición |
|---|---|
| **Proyecto** | Unidad de trabajo (`proyectos`), con `cliente_id` **opcional** (nullable desde la migración `20260922000001`; se creaba sin cliente y se asigna después). Puede ser privado o publicado en el portafolio público (`publicado = true`), y se publica en una sede (`sede`) con una categoría (`categoria`, nullable). |
| **Producto** | Pieza de mobiliario o ambiente dentro de un proyecto (`productos`, ej. Cocina Isla, Closet Walk-in). |
| **Propuesta** | Alternativa de diseño en video (`propuestas_3d`). Contiene video global, punto de reposo (`frame_centro_ms`), estado (`borrador`, `lista`, `enviada`), enlace privado y publicación a portafolio. |
| **Animación** | Clip de video secundario (`propuestas_3d_animaciones`) asociado a una propuesta. Puede ser de tipo `zoom` (acercamiento a detalle) o `interaccion` (movimiento de partes, iluminación). |
| **Video Global** | Video principal en barrido continuo que muestra el producto completo. Se reproduce en bucle hasta que el usuario interactúa. |
| **Frame Centro** | Marca de tiempo en milisegundos (`frame_centro_ms`) que define la vista frontal o de reposo del producto. |
| **Cliente** | Persona que agenda una cita o para quien se desarrolla un proyecto (`clientes`). |
| **Cita** | Reserva de tiempo en la agenda (`citas`) con modalidad (`modalidades_cita`), precio copiado al reservar (`precio_copiado`) y, en las presenciales, `direccion` de la visita. |
| **Staff** | Usuario interno autenticado en el panel (`usuarios`). Tres roles: `admin` (acceso completo), `asesor` (agenda, citas, clientes) y `disenador` (proyectos, productos, propuestas de video). |
| **Enlace Privado** | URL única con token criptográfico (`/propuestas/[token]`) para compartir la propuesta con el cliente sin necesidad de login. |
| **Portafolio** | Catálogo público único (`/portafolio`) con una lista por sede —Santa Marta y Bogotá—, filtrable por `categoria`. La ficha de cada proyecto es plana: no expone el árbol de productos y propuestas del taller, solo portada, galería y un visor. |

## 3. Arquitectura de alto nivel

```
                        Cloudflare DNS
                                      │
                                      ▼
                           ┌──────────────────────────┐
                           │  Caddy (TLS Let's Encrypt) │
                           │  infra/Caddyfile          │
                           └──────────────────────────┘
                                │ reverse_proxy
                                ▼
                    carpinteria-web:3000
                    (Next.js en la RAÍZ del repo)
```

- **Frontend + Backend**: Next.js 16 (App Router) con Route Handlers (`app/api/*/route.ts`). Sin Server Actions.
- **Base de datos**: Supabase single-tenant con Postgres, RLS y triggers de auditoría (`updated_at`, slugs, validaciones).
- **Almacenamiento de Medios**: Supabase Storage bucket `visores-video` (videos globales max 100MB, animaciones max 50MB).
- **Auth**: Cookie HMAC firmada con `SESSION_SECRET` validada contra la tabla `usuarios` en BD con hash scrypt.
- **LLM**: Proveedor configurable (`LLM_PROVIDER`: groq/openai/mock).

## 4. Variables de entorno

### Build-time (horneadas en Docker build)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — WhatsApp del negocio (formato internacional sin símbolos).
- `NEXT_PUBLIC_INSTAGRAM_HANDLE` — Instagram handle.
- `NEXT_PUBLIC_EMAIL` — Email de contacto.

> **Nota sobre dualidad de variables:** `docker-compose.yml` mapea
> `CARPINTERIA_WHATSAPP_NUMBER` → `NEXT_PUBLIC_WHATSAPP_NUMBER` (y lo mismo para Instagram y
> email) como build args. El `.env.example` incluye ambas para compatibilidad. El código consume
> únicamente las `NEXT_PUBLIC_*`.

### Runtime (Supabase)
- `CARPINTERIA_SUPABASE_URL` — URL del proyecto Supabase.
- `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY` — service_role para Route Handlers (escritura/lectura sin RLS). Nunca expuesto al browser.
- `CARPINTERIA_SUPABASE_ANON_KEY` — Acceso anónimo con RLS.

### Runtime (Auth staff)
- `SESSION_SECRET` — Firma HMAC de la cookie `tonfort_staff`.
- Credenciales validadas contra la tabla `usuarios` en BD (email + scrypt).

### Runtime (LLM)
- `LLM_PROVIDER` — `groq`, `openai`, o `mock`.
- `GROQ_API_KEY`, `GROQ_MODEL` — Configuración Groq.
- `OPENAI_API_KEY`, `OPENAI_MODEL` — Configuración OpenAI.

### VPS / Infra
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_PORT`, `VPS_SSH_KEY`, `VPS_REMOTE_DIR`.
- `DOMAIN`, `CADDY_EMAIL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`.
