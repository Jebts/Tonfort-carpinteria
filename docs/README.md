# Tonfort Carpintería

Landing y panel staff para la carpintería Tonfort. Next.js 16 (App Router) + Supabase
(single-tenant) + Caddy.

## Índice de documentación

- `docs/ESTRUCTURA.md` — sistema de carpetas y dónde ubicar cada artifact
- `docs/Constitucion_del_Proyecto.md` — principios no negociables
- `docs/Arquitectura_del_Proyecto.md` — arquitectura de carpetas
- `docs/Convenciones_Codigo.md` — estándares de código
- `docs/Instrucciones_del_Proyecto.md` — reglas de construcción
- `docs/Organigrama.md` — roles y equipo
- `docs/RUTAS.md` — rutas y contrato de backend

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

## Estructura

- `app/` — rutas Next.js (App Router): landing pública + panel staff + API Route Handlers
- `components/` — componentes UI (`tonfort/` = de dominio, `ui/` = primitivos shadcn)
- `lib/` — lógica de negocio (Supabase, auth, citas, proyectos, LLM, contact, validators)
- `hooks/` — hooks de React
- `content/` — contenido estático (markdown/JSON)
- `styles/` — estilos globales (`app/globals.css` importado por `app/layout.tsx`)
- `docs/` — documentación de la app (ver `docs/ESTRUCTURA.md`)
- `infra/` — docker-compose, Caddyfile, scripts de deploy
- `tests/` — tests unitarios (Vitest)
- `public/` — assets estáticos
