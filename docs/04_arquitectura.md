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
| Media Storage | Supabase Storage (buckets `visores-video` y `portafolio-imagenes`) |
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
│   │   ├── public/             # Endpoints públicos: portafolio, visores de landing, propuestas por token
│   │   ├── staff/              # Auth, clientes, citas, diseno (productos, propuestas, animaciones, visores), administracion
│   │   ├── citas/              # Agenda pública de citas (disponibilidad + reserva)
│   │   ├── cotizaciones/       # Módulo histórico de costeo técnico — ARCHIVADO (handlers 404)
│   │   ├── materiales/         # Módulo histórico — ARCHIVADO (handlers 404)
│   │   └── proyectos/          # Módulo histórico — ARCHIVADO (handlers 404)
│   ├── agenda/                 # Agenda pública de citas: flujo lineal de 2 pasos
│   │   ├── modalidad/          # Paso 1: modalidad (virtual / presencial) + diseñador
│   │   ├── horario/           # Paso 2: calendario y reserva (exige ?modalidad=)
│   │   ├── solicitud-recibida/ # Confirmación de la reserva
│   │   ├── paso-1/ paso-2/ paso-3/ confirmacion/   # Route Handlers: 301 a /agenda/modalidad
│   │   └── layout.tsx          # Layout claro de la agenda (única sección en modo claro)
│   ├── sede/                   # Página de la sede (ubicación, mapa, datos de lib/contact.ts)
│   ├── portafolio/             # Portafolio público por sede
│   │   ├── page.tsx            # Alias → /portafolio/santa-marta
│   │   └── [sede]/             # Listado (?categoria=) y [slug]/ ficha plana del proyecto
│   ├── cotizaciones/[token]/   # Vista pública de la cotización por token
│   ├── propuestas/[token]/     # Visor privado de propuesta compartida con cliente
│   ├── staff/                  # Panel staff (layout.tsx + role sections + aliases legacy)
│   │   ├── login/              # Login (exento de middleware)
│   │   ├── administracion/     # admin-only (cotizaciones, usuarios, portafolio)
│   │   ├── gestion/            # asesor+admin (agenda, citas, clientes, proyectos)
│   │   └── diseno/             # disenador+admin (proyectos, productos, propuestas, visores)
│   ├── historia/               # Historia de la marca
│   ├── sitemap.ts              # 6 URLs estáticas (las páginas de proyecto son dinámicas)
│   ├── globals.css             # Design tokens + utilities (única hoja de estilos global)
│   ├── layout.tsx              # Root layout (fuentes, theme provider, analytics)
│   └── page.tsx                # Landing pública
├── components/
│   ├── tonfort/                # Componentes de dominio (VideoViewer, agenda, portafolio, landing)
│   │   ├── landing/            # Secciones de la landing (hero, luz, proyectos-recientes, equipo, agenda-cta)
│   │   ├── agenda/             # Flujo público de cita
│   │   └── staff/              # Formularios y editores del panel (cliente-form, proyecto-fotos, visores-landing-editor)
│   └── ui/                     # Primitivas shadcn/ui
├── content/                    # Contenido estático (historia.ts, landing.ts, sede.ts)
├── cotizacion/                 # Herramienta standalone pendiente de extracción a repo independiente
├── fotos_proyectos_anttiguos/  # 41 fotos sin clasificar — HOLD abierto (ver docs/05_auditoria.md §5)
├── hooks/                      # Hooks de React (use-mobile, use-toast)
├── infra/                      # Despliegue único punto
│   ├── Caddyfile
│   ├── docker-compose.yml
│   └── scripts/                # Scripts VPS + DB (check-tables, reset-and-seed, vps-deploy)
├── lib/                        # Lógica de negocio
│   ├── supabase/               # Cliente Supabase + tipos
│   │   ├── types.ts            # Tipos de dominio y catálogos cerrados (SEDES, CATEGORIAS_MUEBLE, SLUG_SEDE)
│   │   └── server.ts           # Cliente service_role server-only
│   ├── auth-core.ts            # HMAC, firma/verificación de cookies, validación credenciales
│   ├── staff-auth.ts           # Helpers Next.js (requireStaff, requireRol, getSesionServer)
│   ├── staff-client.ts         # Cliente API para el panel staff
│   ├── citas-service.ts        # Servicio de citas (CRUD + agenda + modalidades)
│   ├── agenda.ts               # Generación de slots y bloques horarios
│   ├── agenda-format.ts        # Helpers de formato de fecha/hora de la agenda
│   ├── portfolio-service.ts    # Servicio de portafolio público (filtros sede/categoría, visores de landing)
│   ├── proyectos-service.ts    # Servicio de proyectos del panel de diseño
│   ├── categorias.ts           # Catálogo de categorías + copy de una línea + type guard
│   ├── storage.ts              # Upload en buckets visores-video y portafolio-imagenes
│   ├── validators.ts           # Schemas Zod (proyectoSchema, citaStaffSchema, CATEGORIAS_MUEBLE_SCHEMA)
│   ├── validators-cotizaciones.ts # Schemas Zod del módulo de cotizaciones
│   ├── contact.ts              # Datos de la sede + flag SEDE_PENDIENTE_DATOS
│   ├── estados.ts              # Etiquetas y helpers de estado
│   ├── diseno-access.ts        # Control de acceso al taller de diseño
│   ├── rate-limit.ts           # Límite de peticiones en endpoints públicos
│   ├── llm.ts                  # Asistente de IA
│   ├── errors.ts               # Manejo y sanitización de errores
│   └── utils.ts                # cn(), utilidades
├── supabase/
│   └── migrations/             # Migraciones SQL versionadas (7 archivos)
├── tests/                      # Tests unitarios e integración (Vitest)
│   └── helpers/                # Helpers de test (supabase mock, route request)
├── public/                     # Assets estáticos (ver docs/05_auditoria.md §4)
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

Estado verificado sobre `app/` tras el refactor del espacio público. Detalle completo en
`docs/RUTAS.md`.

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component | Landing (hero, 2 visores `LandingVisor`, luz, proyectos recientes, equipo, CTA de agenda) |
| `/sede` | Server Component | Página de la sede con datos de `lib/contact.ts` |
| `/historia` | Server Component | Historia y filosofía de la marca |
| `/portafolio` | redirect 307 | Alias de `/portafolio/santa-marta` |
| `/portafolio/[sede]` | Server Component (`force-dynamic`) | Catálogo de la sede, con filtro `?categoria=` |
| `/portafolio/[sede]/[slug]` | Server Component (`force-dynamic`) | Ficha plana: portada, galería y visor opcional |
| `/agenda` | redirect 307 | Redirige a `/agenda/modalidad` |
| `/agenda/modalidad` | Server Component | Paso 1: modalidad + diseñador |
| `/agenda/horario` | Server Component | Paso 2: calendario y reserva (`?modalidad=` obligatorio) |
| `/agenda/solicitud-recibida` | Server Component | Confirmación de la reserva |
| `/agenda/paso-1`, `/agenda/paso-2`, `/agenda/paso-3`, `/agenda/confirmacion` | Route Handler | Legacy: 301 a `/agenda/modalidad` |
| `/propuestas/[token]` | Client Component | Enlace privado cliente con visor `VideoViewer` |
| `/cotizaciones/[token]` | Server Component | Cotización pública por token |
| `/proyectos` | redirect 307 | Legacy: a `/portafolio` |
| `/sitemap.xml` | Metadata route | 6 URLs estáticas |
| `/staff/login` | Client Component | Login de staff (exento de middleware) |

El portafolio público ya **no** tiene subárbol de productos: es plano y se publica por sede.
Las rutas `/portafolio/proyectos/[slug]/**` están eliminadas.

---

## 4. API Route Handlers

### 4.1 Públicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/citas?desde=&hasta=&modalidad=` | Disponibilidad; el estado se resuelve por modalidad |
| `POST` | `/api/citas` | Crea cita `en_espera` + cliente; copia costo y duración de la modalidad |
| `GET` | `/api/public/portafolio/proyectos?sede=&categoria=` | Proyectos publicados, filtros validados contra catálogos cerrados |
| `GET` | `/api/public/portafolio/proyectos/[slug]` | `{ proyecto, fotos, visor }` de la ficha pública |
| `GET` | `/api/public/visores-landing` | Visores activos de la landing con sus animaciones |
| `GET` | `/api/public/propuestas/[token]` | Propuesta privada por token con animaciones |
| `GET`/`PATCH` | `/api/cotizaciones/link/[token]` | Vista pública de cotización y selección por token |

Los tres endpoints `/api/public/portafolio/**` y `/api/public/visores-landing` declaran
`export const revalidate = 300`: Next los cachea 5 minutos. `/api/citas/**` no cachea.

`app/api/cotizaciones/**` (salvo `link/[token]`), `app/api/materiales/**` y `app/api/proyectos/**`
son handlers archivados del módulo histórico de costeo técnico: responden `404` o lista vacía.
No forman parte del flujo activo.

### 4.2 Staff (protegidas por middleware y roles)

`proxy.ts` usa el matcher `["/staff/:path*", "/api/staff/:path*"]` y exime `/staff/login` y
`/api/staff/login`. La autorización granular por rol vive en los handlers vía `requireRol(...)`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/api/staff/login` | — | Login y emisión de cookie HMAC |
| `POST` | `/api/staff/logout` | — | Cierre de sesión y limpieza de cookie |
| `POST` | `/api/staff/ai-suggest` | any staff | Asistente de IA para textos de portafolio |
| `GET`/`POST` | `/api/staff/clientes` | admin\|asesor | Lista y crea clientes |
| `GET`/`PUT`/`DELETE` | `/api/staff/clientes/[id]` | admin\|asesor | Detalle, edición y borrado de cliente |
| `GET`/`POST` | `/api/staff/citas` | admin\|asesor | Lista y crea citas internas |
| `PATCH`/`PUT`/`DELETE` | `/api/staff/citas/[id]` | admin\|asesor | Acciones de cita y edición de campos (incluye `direccion`) |
| `GET`/`POST` | `/api/staff/usuarios` | admin | Lista y crea usuarios staff (asesor/disenador) |
| `GET`/`PUT`/`DELETE` | `/api/staff/usuarios/[id]` | admin | Edición y desactivación de staff |
| `GET` | `/api/staff/diseno/visores-landing` | admin\|disenador | Lista los 2 visores de la landing |
| `PUT` | `/api/staff/diseno/visores-landing` | admin | Upsert por `slot` |
| `GET`/`POST` | `/api/staff/diseno/visores-landing/[slot]/animaciones` | admin\|disenador | Lista y crea animaciones del visor |
| `POST` | `/api/staff/diseno/visores-landing/[slot]/upload-global-video` | admin\|disenador | Sube el video global del visor |
| `GET`/`POST` | `/api/staff/diseno/proyectos` | admin\|disenador | Proyectos para taller de diseño (sin cliente directo) |
| `GET`/`PATCH`/`DELETE` | `/api/staff/diseno/proyectos/[id]` | admin\|disenador | Detalle, edición y borrado de proyecto de diseño |
| `GET`/`POST` | `.../productos` | admin\|disenador | Productos del proyecto |
| `GET`/`PUT`/`DELETE` | `.../productos/[productoId]` | admin\|disenador | Detalle, edición y borrado de producto |
| `GET`/`POST` | `.../propuestas` | admin\|disenador | Propuestas del producto |
| `GET`/`PUT`/`PATCH`/`DELETE` | `.../propuestas/[propuestaId]` | admin\|disenador | Detalle, edición, cambio de estado y borrado |
| `POST`/`DELETE` | `.../propuestas/[propuestaId]/upload-global-video` | admin\|disenador | Subida y eliminación de video global |
| `POST` | `.../propuestas/[propuestaId]/duplicar` | admin\|disenador | Duplica una propuesta con sus animaciones |
| `POST` | `.../propuestas/[propuestaId]/link-privado` | admin\|disenador | Activa/desactiva enlace privado con token |
| `POST` | `.../propuestas/[propuestaId]/publicar-portafolio` | admin | Publica/despublica en portafolio público |
| `GET`/`POST` | `.../animaciones` | admin\|disenador | Lista y crea animaciones secundarias |
| `GET`/`PUT`/`DELETE` | `.../animaciones/[animacionId]` | admin\|disenador | Detalle, edición y borrado de animación |
| `POST`/`DELETE` | `.../animaciones/[animacionId]/upload-video` | admin\|disenador | Subida y eliminación de video de animación |
| `GET` | `/api/staff/administracion/portafolio/proyectos` | admin | Lista de proyectos para publicar (solo lectura) |
| `PATCH`/`DELETE` | `/api/staff/administracion/portafolio/proyectos/[id]` | admin | Edición de publicación (incluye `sede`, `categoria`, `portada_url`) / borrado |
| `GET`/`POST` | `/api/staff/administracion/portafolio/proyectos/[id]/fotos` | admin | Lista ordenada de la galería / subida de una foto |
| `DELETE` | `/api/staff/administracion/portafolio/proyectos/[id]/fotos/[fotoId]` | admin | Borra la foto y limpia `portada_url` si era la portada |
| `GET`/`POST` | `/api/staff/administracion/cotizaciones` | admin | Lista y crea cotizaciones |
| `GET` | `/api/staff/administracion/cotizaciones/[cotizacionId]` | admin | Detalle de la cotización |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/precio` | admin | Actualiza precios de cotización |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/seleccion` | admin | Actualiza selección de propuesta |
| `DELETE` | `/api/staff/administracion/cotizaciones/[cotizacionId]/productos/[cotizacionProductoId]` | admin | Quita un producto derivado |
| `DELETE` | `/api/staff/administracion/cotizaciones/[cotizacionId]/propuestas/[cotizacionPropuestaId]` | admin | Quita una propuesta derivada |

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
