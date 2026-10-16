# Tonfort Carpintería

Landing y panel staff para la carpintería artesanal Tonfort. Next.js 16 (App Router) + Supabase
(single-tenant) + Caddy.

## Índice de documentación

| Doc | Descripción |
|---|---|
| `docs/00_contexto_general.md` | Qué es el proyecto, glosario, vars de entorno |
| `docs/01_reglas_negocio.md` | Roles, estados de cita, fases de cliente, agenda |
| `docs/02_modelo_datos.md` | Entidades y relaciones (con inconsistencia types.ts vs migrations) |
| `docs/03_design_system.md` | Tokens visuales (colores, tipografía, utilities) |
| `docs/04_arquitectura.md` | Stack tech, estructura de carpetas, convenciones de código |
| `docs/05_auditoria.md` | Inventario de archivos, código muerto, desviaciones |
| `docs/11_manifiesto_portafolio.md` | Manifiesto de 190 proyectos del portafolio histórico de Bogotá |
| `docs/12_reinit_y_set_base.md` | Reinit reproducible, set base versionado, comando `npm run db:reinit` |
| `docs/RUTAS.md` | Contrato de rutas y backend |
| `docs/Organigrama.md` | Flujo de despliegue |
| `docs/planificacion-3D/` | Planificación aspiracional del módulo 3D (no existe en el repo; plan aspiracional) |

## Cómo correr (desarrollo local)

```bash
npm install
npm run dev   # http://localhost:3000
```

Build de producción:

```bash
npm run build
```

## Variables (ver `.env.example`)

Se hornean en build desde `.env`:

- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_INSTAGRAM_HANDLE`
- `NEXT_PUBLIC_EMAIL`

Backend Supabase (runtime):

- `CARPINTERIA_SUPABASE_URL`
- `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY`
- `CARPINTERIA_SUPABASE_ANON_KEY`

Auth staff (runtime):

- `STAFF_CREDENTIALS`
- `SESSION_SECRET`

LLM (server-side, sin prefijo):

- `LLM_PROVIDER`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`

## Estructura rápida

- `app/` — rutas Next.js (App Router): landing pública + panel staff + API Route Handlers
- `components/` — componentes UI (`tonfort/` = de dominio, `ui/` = primitivos shadcn)
- `lib/` — lógica de negocio (Supabase, auth, citas, proyectos, LLM, validators)
- `hooks/` — hooks de React
- `content/` — contenido estático (historia.ts)
- `docs/` — documentación de la app
- `infra/` — docker-compose, Caddyfile, scripts de deploy
- `tests/` — tests unitarios (Vitest)
- `public/` — assets estáticos

## Para agentes de IA

Lee `AGENTS.md` en la raíz antes de trabajar en este proyecto.
