# Arquitectura de carpetas del proyecto

Convención de organización de archivos del reposio. Fuente de verdad para decidir
dónde crear cualquier artefacto nuevo (workflows, SQL, scripts, docs).

Jerarquía de autoridad (docs): `Constitucion_del_Proyecto.md` > `Esquema_*.md` >
`Estructura_Logica_de_Solicitudes.md` > `Herramientas_del_Proyecto.md` >
`Instrucciones_del_Proyecto.md` > esta arquitectura > conversación actual.

## Árbol

```
.
├── README.md                      # Estado de fases + índice de docs
├── .env                           # ÚNICA fuente de verdad (gitignored). Contenido real de secretos.
├── .env.example                   # Plantilla canónica consolidada (commiteada, sin secretos)
├── docs/                          # Documentación fuente de verdad (markdown)
├── apps/                          # Aplicaciones autónomas (no se importan entre sí)
│   ├── saas/                      # App de producción (F5): Next.js + Supabase
│   │   ├── docs/                  # docs de backend/db/n8n/UI de saas
│   │   ├── db/                    # sql/ (schema, fixes, seeds) + scripts/ + docs/
│   │   ├── services/              # n8n (workflows, sub-workflows, credentials)
│   │   ├── infra/                 # docker-compose.saas.yml + deploy.config.sh + scripts/
│   │   └── scripts/               # scripts propios del front (.mjs)
│   └── carpinteria/               # Landing de Carpintería (Next.js, 100% estática, sin backend)
│       └── docs/ infra/ services/ db/   # andamiaje por app (placeholders)
├── services/                      # Servicios compartidos (placeholder global; n8n ya es de saas)
├── db/                            # BD compartida (placeholder global; la BD es de saas)
├── infra/                         # Hub de despliegue (NO dueño del .env)
│   ├── scripts/                   # Scripts VPS (vps-deploy, vps-stop, vps-status, vps-reset, vps-logs, vps-shell, dns_cloudflare)
│   ├── Caddyfile                  # Reverse proxy + TLS (referenciado por compose como ./Caddyfile)
│   ├── docker-compose.yml         # Stack base: n8n/saas-web en profiles:["never"] + Caddy + apps
│   └── (overrides por app en apps/<app>/infra/docker-compose.<app>.yml)
└── docs/                          # Documentación transversal
```

> Nota: `apps/saas/` contiene `app/`, `components/`, `lib/`, `scripts/`, `tests/`,
> `tests-e2e/`, `middleware.ts`, `Dockerfile`, `next.config.mjs`, `tsconfig.json`
> (alias `@/*` → `apps/saas/*`). `apps/carpinteria/` contiene `app/`, `components/`,
> `lib/` (`contact.ts`), `Dockerfile`, `next.config.mjs`, `tsconfig.json`
> (alias `@/*` → `apps/carpinteria/*`).

> **Unificación de entorno (Fase 1):** `.env` vive en la **raíz** y `docker-compose.yml`
> vive en `infra/`. `infra/` ya no tiene `.env` ni `.env.example` propios; solo el `Caddyfile`,
> el compose y los `scripts/`. El SaaS consume `NEXT_PUBLIC_*` **derivadas** de `SUPABASE_*`
> dentro del `.env` raíz; no se toca el código del front. Para desarrollo local del front sin
> Docker, `apps/saas/.env.local` repite los valores reales de la raíz (Next.js no expande `${VAR}`).
    ├── app/                       # App Router de una sola página (landing)
    ├── components/                # Componentes React (tonfort/ + ui/ de shadcn)
    ├── lib/                       # contact.ts (WhatsApp/IG/email desde NEXT_PUBLIC_*)
    ├── public/                    # Imágenes estáticas
    ├── Dockerfile                 # Imagen de producción (sin Supabase)
    ├── next.config.mjs            # images.unoptimized + ignoreBuildErrors
    └── tsconfig.json              # Path alias: @/* → carpinteria/*
```

> **Unificación de entorno (Fase 1):** `.env` y `docker-compose.yml` viven en la **raíz**.
> `infra/` ya no tiene `.env`, `.env.example` ni `docker-compose.yml`; solo el `Caddyfile`
> y los `scripts/`. El SaaS consume `NEXT_PUBLIC_*` **derivadas** de `SUPABASE_*`
> (`NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`, etc.) dentro del `.env` raíz; no se toca el
> código del front. Para desarrollo local del front sin Docker, `apps/saas/.env.local` repite los
> valores reales de la raíz (Next.js no expande `${VAR}`).

## Reglas de ubicación

- **SQL canónico** (esquema vigente) → `db/sql/schema/`. Nunca se edita en otra carpeta.
- **Parches/pinches** a una BD ya poblada → `db/sql/fixes/`.
- **Datos de prueba / fixtures** → `db/sql/seeds/`.

Las tablas de la app viven en el schema `public` (schema por defecto de Supabase para
datos de la app). `auth` es un schema gestionado por Supabase Auth (contiene
`auth.users`, referenciado por las FKs `auth_user_id` de `usuarios_internos` /
`usuarios_empresa`); no se crean tablas de negocio allí. Por eso el WARN 0014
`extension_in_public` se acepta como documentado.

- **Workflows de una solicitud documentada** (A1, A2, A3, B1…B13, C1…C7, D) →
  `services/n8n/workflows/`; nombre `{sección}{número} - {nombre corto en minúsculas con guiones}.json`.
- **Sub-workflows y helpers compartidos** (Agente IA, D como sub, _Error Handler) →
  `services/n8n/sub-workflows/`.
- **Credenciales**: no se commitea ningún secreto; solo el README de convención en
  `services/n8n/credentials/`. Las variables del proyecto viven en `.env` (raíz); los tokens OAuth /
  credenciales Postgres viven en el credential store de n8n.
- **Infra**: `Caddyfile`, `docker-compose.yml` y `scripts/` en `infra/`. El `.env` de
  secretos está en la **raíz**, no en `infra/`.

### Reglas de ubicación en `apps/saas/`

- **Rutas** → `app/` (App Router). Cada dominio Staff / Operador / Empresa tiene su
  layout propio (`app/staff/layout.tsx`, `app/operador/layout.tsx`, `app/admin/panel/layout.tsx`).
- **Server Actions** → `lib/actions/` (un archivo por dominio: `empresa.ts`, `citas.ts`,
  `clientes.ts`, `operadores.ts`, `suscripcion.ts`, `mfa.ts`, etc.).
- **Componentes shared** → `components/ui/` (primitivas sin conocimiento de dominio).
- **Componentes de dominio** → `components/{staff,panel,operador,landing,...}/`
  (conocen el dominio pero no la ruta).
- **Lógica pura** (validadores, normalizadores, regex) → `lib/*.ts` fuera de `actions/`
  y **sin** `'use client'`. Se importa desde cliente y server.
- **Tests unitarios** → `tests/` (vitest).
- **Tests E2E** → `tests-e2e/` (Playwright).
- **Scripts utilitarios** → `scripts/` (seed, migraciones, reset MFA).

## Convenciones transversales

- Roles/credenciales Postgres fijos: `app_router` (BYPASSRLS, excepciones) y
  `app_tenant` (RLS vía `SET app.tenant_id`). Ver `services/n8n/credentials/README.md`.
- Ningún secreto en el repo: `.env`, keys y passwords solo en entorno/gestor de secretos.
- Cada nodo de n8n se nombra `{número de paso}. {qué hace}` según el doc de Estructura.

## Fases (ruta crítica: F0 → F1 → F2 → F3 → F4 → F5)

- **F0** documentación y entorno base — completado.
- **F1** infra n8n self-hosted + Caddy — completado.
- **F2** conexión a BD + esquema v9.1 (fix linter 0010/0013/0011) — completado
  (reinit en Supabase aplicado; script idempotente en `db/sql/schema/`).
- **F3** conexión n8n ↔ Supabase — completado y operativo.
- **F4** workflows n8n A1/A2/A3 + Agente IA + Error Handler — completado en git; LLM migrado a `LLM_PROVIDER` configurable.
- **F5** app de producción `apps/saas/` (Next.js + Supabase) — en construcción. Reutiliza esquema v9,
  vistas (`v_consumo_tokens_empresa`) y RLS; reemplaza el alta de empresa (B1 / "Empresa Admin").

### F3 — Conexión n8n ↔ Supabase (capa de integración/credenciales)

**Objetivo:** que los workflows (los de F4 ya exportados y los futuros B/C) puedan
operar la BD con los roles de seguridad correctos y el aislamiento RLS funcionando
de punta a punta.

**Tareas:**
1. Crear/confirmar en n8n las dos credenciales fijas `Postgres - app_router`
   (rol `app_router`, BYPASSRLS) y `Postgres - app_tenant` (rol `app_tenant`, RLS),
   apuntando al proyecto Supabase (`SUPABASE_DB_URL`).
2. Configurar las variables de entorno de n8n (fuente: `docs/Herramientas_del_Proyecto.md`
   §10): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
    `SUPABASE_DB_URL`, `LLM_PROVIDER`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `META_*`, `WOMPI_*`, `RESEND_API_KEY`,
    `N8N_ENCRYPTION_KEY`.
3. Documentar en `services/n8n/credentials/README.md` cómo se fija `app.tenant_id` por
   operación con `app_tenant`.
4. **Smoke test de operación con RLS** (valida lo prometido en F2):
   - Con `app_tenant` + `SET app.tenant_id = '<uuid>'`, insertar 1 empresa y
     verificar que `app_tenant` sin `SET`, y `app_router` donde aplique, respetan
     el aislamiento (RLS deniega lo que no es del tenant).
   - Validar que `app_router` puede hacer las excepciones documentadas
     (B1 alta de empresa, B13 confirmación manual, schedules `C*`).
5. Confirmar que los 6 workflows exportados en `services/n8n/workflows/` y
   `services/n8n/sub-workflows/` conectan a Supabase sin error de credenciales.

**Criterio de terminación:** n8n opera la BD con RLS funcionando de extremo a
extremo; el aislamiento prometido en F2 queda validado operativamente, no solo a
nivel de esquema.

> Parámetros de conexión reales (host del pooler, user con sufijo `.REF`, SSL) y el
> manejo del `SET app.tenant_id` en n8n están en `services/n8n/credentials/README.md`. Los
> WARN del linter (0014 `extension_in_public` y 0024 `rls_policy_always_true`) se
> documentan allí como aceptados, para tenerlos en cuenta al diseñar los flujos.
