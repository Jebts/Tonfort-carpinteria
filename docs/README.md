# Tonfort Carpintería

Landing y panel staff para la carpintería Tonfort. Next.js 16 (App Router) + Supabase
(single-tenant) + Caddy.

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

- `app/` — rutas Next.js (App Router)
- `components/` — componentes UI
- `lib/` — lógica de negocio (Supabase, auth, LLM)
- `db/` — scripts de BD y seeds
- `docs/` — documentación de la app
- `infra/` — docker-compose, Caddyfile, scripts de deploy
- `scripts/` — scripts auxiliares del front
- `tests/` — tests unitarios (Vitest)
- `public/` — assets estáticos
