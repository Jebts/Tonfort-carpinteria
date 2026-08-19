# tonfort — Carpintería (landing + panel staff)

Next.js 16 (App Router) + React 19 + Supabase (single-tenant) para el sitio de
carpintería artesanal. Incluye:
- Landing pública (portafolio, servicios, historia, contacto).
- Agenda pública de citas (bloques de 2 h).
- Panel de staff (proyectos, clientes, citas, configuración).
- Asistente de IA para redacción de portafolio (LLM configurable: mock/groq/openai).

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (single-tenant, propio de la carpintería)
- Caddy (reverse proxy + TLS automático)

## Documentación

- `docs/Constitucion_del_Proyecto.md` — principios no negociables.
- `docs/Arquitectura_del_Proyecto.md` — arquitectura de carpetas.
- `docs/Convenciones_Codigo.md` — estándares de código.
- `docs/Instrucciones_del_Proyecto.md` — reglas de construcción.
- `docs/Organigrama.md` — roles y equipo.
- `docs/README.md` — índice de documentación.
- `docs/RUTAS.md` — rutas de la app.
- `db/docs/Esquema_de_Base_de_Datos_v9.md` — DDL + RLS + triggers.

## Desarrollo

```bash
npm install
npm run dev        # desarrollo
npm run build      # producción
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unitario
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores. Las variables se dividen en:

- **Públicas (build-time):** `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_HANDLE`, `NEXT_PUBLIC_EMAIL`
- **Backend Supabase:** `CARPINTERIA_SUPABASE_URL`, `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY`, `CARPINTERIA_SUPABASE_ANON_KEY`
- **Auth staff:** `STAFF_CREDENTIALS`, `SESSION_SECRET`
- **LLM:** `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`

> Nota: las variables de LLM se leen **sin prefijo** `CARPINTERIA_*`.

## Despliegue

```bash
# 1. Configura DNS: carpinteria.{DOMAIN} -> IP del VPS
# 2. cp .env.example .env y completa valores reales
# 3. bash infra/scripts/vps-deploy.sh
```

## Subdominios

- `carpinteria.{DOMAIN}` — sitio principal
