# Tonfort — Arquitectura

Fuente de verdad para entender el stack, la estructura de carpetas y las convenciones de código
de este repo.

## 1. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript (modo estricto) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Visor Interactivo | HTML5 Video interactivo + `VideoViewer` (reemplaza Three.js/R3F) |
| Base de datos | Supabase (single-tenant, propio de la carpintería, Postgres + RLS) |
| Media Storage | Supabase Storage (bucket `visores-video`) |
| Auth | HMAC cookie (`SESSION_SECRET`) con credenciales en BD (`usuarios`, scrypt) |
| Middleware | `proxy.ts` (Next.js middleware, protege `/staff/*` y `/api/staff/*`) |
| Analytics | `@vercel/analytics/next` |
| LLM | Configurable (`LLM_PROVIDER`: groq/openai/mock) |
| Deploy | Docker multi-stage + Caddy (TLS Let's Encrypt) |
| Tests | Vitest + Testing Library |
| Linter | ESLint (Next.js) |

## 2. Estructura de carpetas

```
.
├── app/                        # App Router (Next.js idiomatic — sin src/)
│   ├── api/                    # Route Handlers (app/api/)
│   │   ├── public/             # Endpoints públicos de portafolio y propuestas por token
│   │   ├── staff/              # Auth, clientes, citas, proyectos, diseno (productos, propuestas, animaciones)
│   │   ├── citas/              # Agenda pública de citas
│   │   └── cotizaciones/       # Administración y vista pública de cotizaciones
│   ├── agenda/                 # Agenda pública de citas (redirige a /agenda/paso-1)
│   │   ├── paso-1/             # Selección de diseñador
│   │   ├── paso-2/             # Selección de modalidad + costo
│   │   ├── paso-3/             # Calendario y reserva
│   │   └── confirmacion/       # Confirmación de reserva
│   ├── portafolio/             # Portafolio público
│   │   └── proyectos/[slug]/   # Detalle de proyecto, productos y propuestas
│   ├── propuestas/[token]/     # Visor privado de propuesta compartida con cliente
│   ├── staff/                  # Panel staff (layout.tsx + role sections)
│   │   ├── login/              # Login (exento de middleware)
│   │   ├── administracion/     # admin-only (cotizaciones, usuarios, portafolio)
│   │   ├── gestion/            # asesor+admin (agenda, citas, clientes)
│   │   └── diseno/             # disenador+admin (proyectos, productos, propuestas de video)
│   ├── historia/               # Historia de la marca
│   ├── globals.css             # Design tokens + utilities (única hoja de estilos global)
│   ├── layout.tsx              # Root layout (fuentes, theme provider, analytics)
│   └── page.tsx                # Landing pública
├── components/
│   ├── tonfort/                # Componentes de dominio (VideoViewer, Agenda, Portafolio)
│   │   └── legacy/             # Componentes legacy archivados
│   └── ui/                     # Primitivas shadcn/ui
├── content/                    # Contenido estático (historia.ts)
├── hooks/                      # Hooks de React (use-mobile, use-toast)
├── infra/                      # Despliegue único punto
│   ├── Caddyfile
│   ├── docker-compose.yml
│   └── scripts/                # Scripts VPS + DB (check-tables, reset-and-seed, vps-deploy)
├── lib/                        # Lógica de negocio
│   ├── supabase/               # Cliente Supabase + tipos
│   │   ├── types.ts            # Tipos de dominio limpios (Proyecto, Producto, Propuesta3D, etc.)
│   │   └── server.ts           # Cliente service_role server-only
│   ├── legacy/                 # Código y tipos legacy archivados
│   ├── auth-core.ts            # HMAC, firma/verificación de cookies, validación credenciales
│   ├── staff-auth.ts           # Helpers Next.js (requireStaff, requireRol, getSesionServer)
│   ├── staff-client.ts         # Cliente API para el panel staff
│   ├── citas-service.ts        # Servicio de citas (CRUD + agenda)
│   ├── portfolio-service.ts    # Servicio de portafolio público
│   ├── agenda.ts               # Generación de slots y bloques horarios
│   ├── storage.ts              # Upload y gestión en bucket visores-video
│   ├── llm.ts                  # Asistente de IA
│   ├── validators.ts           # Schemas Zod
│   ├── errors.ts               # Manejo de errores
│   └── utils.ts                # cn(), utilidades
├── supabase/
│   └── migrations/             # Migraciones SQL limpias versionadas
├── tests/                      # Tests unitarios e integración (Vitest)
│   └── helpers/                # Helpers de test (supabase mock, route request)
├── public/                     # Assets estáticos
├── proxy.ts                    # Next.js middleware (raíz — requerido por Next 16)
├── middleware.ts               # Re-exports proxy.ts (entry point de Next.js middleware)
├── Dockerfile                  # Multi-stage build
├── next.config.mjs             # Configuración Next.js
├── tsconfig.json               # TypeScript estricto; alias @/ → raíz
├── package.json
├── AGENTS.md                   # Entrada maestra para agentes IA
└── docs/                       # Documentación técnica
```

---

## 3. Rutas públicas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component | Landing (hero, servicios, historia, galería, proceso, CTA, footer) |
| `/portafolio` | Server Component | Catálogo del portafolio público |
| `/portafolio/proyectos/[slug]` | Server Component | Detalle de proyecto y listado de productos |
| `/portafolio/proyectos/[slug]/productos/[productoId]` | Server Component | Detalle de producto y propuestas públicas |
| `/portafolio/proyectos/[slug]/productos/[productoId]/propuestas/[propuestaId]` | Client Component | Visor interactivo `VideoViewer` de la propuesta |
| `/propuestas/[token]` | Client Component | Enlace privado cliente con visor `VideoViewer` |
| `/historia` | Server Component | Historia y filosofía de la marca |
| `/agenda` | redirect 302 | Redirige a `/agenda/paso-1` |
| `/agenda/paso-1` | Client Component | Selección de diseñador (3-step) |
| `/agenda/paso-2` | Client Component | Selección de modalidad + costo |
| `/agenda/paso-3` | Client Component | Calendario y reserva de cita |
| `/agenda/confirmacion` | Server Component | Confirmación de reserva |
| `/staff/login` | Client Component | Login de staff (exento de middleware) |

---

## 4. API Route Handlers

### 4.1 Públicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/citas?desde=&hasta=` | Disponibilidad de agenda |
| `POST` | `/api/citas` | Crea cita en_espera + cliente asociado |
| `GET` | `/api/public/portafolio/proyectos` | Proyectos publicados en portafolio |
| `GET` | `/api/public/portafolio/proyectos/[slug]` | Detalle de proyecto publicado |
| `GET` | `/api/public/portafolio/proyectos/[slug]/productos` | Productos de proyecto publicado |
| `GET` | `/api/public/portafolio/proyectos/[slug]/productos/[productoId]/propuestas/[propuestaId]` | Propuesta pública con animaciones |
| `GET` | `/api/public/propuestas/[token]` | Propuesta privada por token con animaciones |
| `GET`/`PATCH` | `/api/cotizaciones/link/[token]` | Vista pública de cotización y selección por token |

### 4.2 Staff (protegidas por middleware y roles)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/api/staff/login` | — | Login y emisión de cookie HMAC |
| `POST` | `/api/staff/logout` | — | Cierre de sesión y limpieza de cookie |
| `POST` | `/api/staff/ai-suggest` | any staff | Asistente de IA para textos de portafolio |
| `GET`/`POST` | `/api/staff/clientes` | admin\|asesor | Lista y crea clientes |
| `GET`/`PUT`/`DELETE` | `/api/staff/clientes/[id]` | admin\|asesor | Detalle, edición y borrado de cliente |
| `GET`/`POST` | `/api/staff/citas` | admin\|asesor | Lista y crea citas internas |
| `PATCH`/`PUT`/`DELETE` | `/api/staff/citas/[id]` | admin\|asesor | Acciones de cita (aceptar, cancelar, mover, eliminar) |
| `GET`/`POST` | `/api/staff/usuarios` | admin | Lista y crea usuarios staff (asesor/disenador) |
| `GET`/`PUT`/`DELETE` | `/api/staff/usuarios/[id]` | admin | Edición y desactivación de staff |
| `GET`/`POST` | `/api/staff/diseno/proyectos` | admin\|disenador | Proyectos para taller de diseño (sin cliente directo) |
| `GET`/`PATCH`/`DELETE` | `/api/staff/diseno/proyectos/[id]` | admin\|disenador | Detalle, edición y borrado de proyecto de diseño |
| `GET`/`POST` | `.../productos` | admin\|disenador | Productos del proyecto |
| `GET`/`PUT`/`DELETE` | `.../productos/[productoId]` | admin\|disenador | Detalle, edición y borrado de producto |
| `GET`/`POST` | `.../propuestas` | admin\|disenador | Propuestas del producto |
| `GET`/`PUT`/`PATCH`/`DELETE` | `.../propuestas/[propuestaId]` | admin\|disenador | Detalle, edición, cambio de estado y borrado |
| `POST`/`DELETE` | `.../propuestas/[propuestaId]/upload-global-video` | admin\|disenador | Subida y eliminación de video global |
| `POST` | `.../propuestas/[propuestaId]/duplicar` | admin\|disenador | Duplica una propuesta con sus animaciones |
| `POST` | `.../propuestas/[propuestaId]/link-privado` | admin\|disenador | Activa/desactiva enlace privado con token |
| `GET`/`POST` | `.../animaciones` | admin\|disenador | Lista y crea animaciones secundarias |
| `GET`/`PUT`/`DELETE` | `.../animaciones/[animacionId]` | admin\|disenador | Detalle, edición y borrado de animación |
| `POST`/`DELETE` | `.../animaciones/[animacionId]/upload-video` | admin\|disenador | Subida y eliminación de video de animación |
| `GET`/`POST` | `/api/staff/administracion/cotizaciones` | admin | Lista y crea cotizaciones |
| `GET`/`POST` | `/api/staff/administracion/cotizaciones/[cotizacionId]` | admin | Detalle y asociación de propuestas |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/precio` | admin | Actualiza precios de cotización |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/seleccion` | admin | Actualiza selección de propuesta |

---

## 5. Convenciones de código

### TypeScript
- **Modo estricto** (`tsconfig.json` `strict: true`). Cero tolerancia a `any`.
- Imports de tipo con `type` explícito: `import type { Propuesta3D } from "@/lib/supabase/types"`.
- Validaciones con Zod en capas de entrada (handlers y forms).

### Handlers y Arquitectura
- **Route Handlers** exclusivamente en `app/api/`. Prohibido el uso de Server Actions (`lib/actions/` no existe).
- Imports con alias canónico `@/*`.

### Manejo de Roles y Seguridad
- `proxy.ts` (middleware) valida la presencia e integridad de la cookie de sesión staff (`tonfort_staff`).
- La autorización granular por rol (`admin`, `asesor`, `disenador`) se ejecuta en layouts y handlers vía `requireRol(...)` o `getDisenoProjectAccess(...)`.

---

## 6. Pipeline y Arquitectura de Video (`VideoViewer`)

La visualización de propuestas se realiza mediante el componente interactivo `VideoViewer` (`components/tonfort/video-viewer.tsx`):

1. **Video Global en Bucle**:
   - Se carga el video principal subido en `visores-video` en un slot independiente.
   - La duración del video global se conserva separada de la duración de los clips.
   - Si no hay interacción, reproduce en bucle infinito.
   - El reposo usa `frame_centro_ms` (posición canónica de reposo), no una posición fija del clip.
2. **Animaciones Secundarias**:
   - Cada animación registrada en `propuestas_3d_animaciones` se muestra como un selector interactivo.
   - Al pulsar una animación, el reproductor carga fluidamente el clip correspondiente (`video_movimiento_url` y, si existe, `video_accion_url`).
   - Al finalizar el clip o pulsar "Volver al centro", el visor revierte el clip activo y vuelve al slot global en el frame central configurado.
   - Si se selecciona otro nodo durante el retorno, la selección queda en cola para evitar transiciones concurrentes.
3. **Optimización en Blender**:
   - Render con iluminación horneada (baking) previa para lograr realismo fotorrealista sin consumo computacional en el cliente móvil.
   - Exportación recomendada: Códec H.264 / AAC o WebM VP9 optimizado para web.
