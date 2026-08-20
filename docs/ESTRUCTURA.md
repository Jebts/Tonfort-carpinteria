# Estructura de carpetas — Tonfort Carpintería

Mapa del sistema de carpetas de la raíz del repo (`/Users/jebts/Documents/Proyects/tonfort`),
app Next.js 16 en carpintería. La raíz es **idiomática de Next.js** (App Router en `app/`,
sin `src/`). No se recrean carpetas de datos (`db/`) ni scripts huérfanos (`scripts/`).

## Mapa de la raíz

| Ruta | Responsabilidad |
|---|---|
| `app/` | App Router: landing pública, panel staff y API Route Handlers |
| `components/` | Componentes de UI (`tonfort/` = de dominio, `ui/` = primitivos shadcn) |
| `lib/` | Lógica de negocio y servicios (Supabase, auth, citas, proyectos, LLM…) |
| `hooks/` | Hooks de React reutilizables |
| `content/` | Contenido estático (markdown/JSON del sitio) |
| `styles/` | Estilos globales (solo `app/globals.css`, importado por `app/layout.tsx`) |
| `docs/` | Documentación del proyecto (índice en `docs/README.md`) |
| `infra/` | Despliegue: `docker-compose.yml`, `Caddyfile`, `scripts/` de VPS |
| `tests/` | Tests unitarios (Vitest) |
| `public/` | Assets estáticos servidos tal cual |
| `proxy.ts` | Middleware de Next.js (protege `/staff/*`); **debe quedar en la raíz** |
| `app/globals.css` | Única hoja de estilos global (Tailwind v4) |
| `next.config.mjs` | Config de Next |
| `tsconfig.json` | TS; define el alias `@/*` → raíz |
| `components.json` | Config de shadcn/ui |
| `package.json` / `package-lock.json` | Dependencias y scripts |
| `Dockerfile` | Imagen de producción |
| `.env.example` | Plantilla de variables de entorno |

## Detalle de `app/`

- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — landing + layout raíz
- `app/proyectos/`, `app/historia/`, `app/agenda/` — rutas públicas
- `app/api/` — Route Handlers (`/api/citas`, `/api/staff/*`)
- `app/staff/` — panel protegido por `proxy.ts`:
  `login`, `page.tsx` (dashboard), `agenda`, `citas`, `clientes`, `portafolio`

## Detalle de `lib/`

- `lib/supabase/` — cliente Supabase (server-side `service_role`, `anon`)
- `lib/auth-core.ts`, `lib/staff-auth.ts`, `lib/staff-client.ts` — auth de staff y sesión
- `lib/citas-service.ts`, `lib/agenda.ts`, `lib/proyectos-service.ts` — servicios de dominio
- `lib/llm.ts` — asistente de IA (provider mock/groq/openai)
- `lib/contact.ts`, `lib/estados.ts`, `lib/errors.ts`, `lib/rate-limit.ts`,
  `lib/storage.ts`, `lib/utils.ts`, `lib/validators.ts` — utilidades
- `lib/supabase/types.ts` — tipos de dominio (espejo del esquema en Supabase)

## Reglas de ubicación (dónde va cada artifact)

- **Ruta/página** → `app/<ruta>/page.tsx` (o `app/api/.../route.ts` para handlers)
- **Componente de UI** → `components/tonfort/` (dominio) o `components/ui/` (primitivo shadcn)
- **Hook** → `hooks/`
- **Lógica de negocio / servicio / cliente externo** → `lib/`
- **Server Action** → `lib/actions/` (o junto al servicio correspondiente en `lib/`)
- **Tipos de dominio** → `lib/supabase/types.ts`
- **Test** → `tests/<nombre>.test.ts(x)`
- **Config de despliegue** → `infra/` (nunca se referencia desde el código de la app)
- **Contenido editable del sitio** → `content/`

## Alias canónico

`@/*` → raíz del repo (definido en `tsconfig.json`). Usar siempre `@/lib/...`,
`@/components/...`, `@/app/...` en imports; no rutas relativas profundas.

## Notas

- `infra/` es **solo despliegue** (Caddy + compose + scripts VPS). El código de la app
  no debe importar nada desde `infra/`.
- El esquema de base de datos (tablas + RLS + seed) vive en el **proyecto Supabase**
  propio de la carpintería; no hay scripts SQL versionados en el repo.
- Variables de entorno coherentes con el código: `CARPINTERIA_SUPABASE_*`,
  `NEXT_PUBLIC_*`, `STAFF_CREDENTIALS`, `SESSION_SECRET`, `LLM_*` (sin prefijo).
