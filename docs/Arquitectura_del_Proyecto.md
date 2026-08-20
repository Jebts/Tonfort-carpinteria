# Arquitectura de carpetas del proyecto (carpintería)

Convención de organización de archivos de **este repo** (`tonfort`, carpintería).
Fuente de verdad para decidir dónde crear cualquier artefacto nuevo (scripts, docs).

Jerarquía de autoridad (docs): `Constitucion_del_Proyecto.md` > `Esquema_*.md` >
`Estructura_Logica_de_Solicitudes.md` > `Herramientas_del_Proyecto.md` >
`Instrucciones_del_Proyecto.md` > esta arquitectura > conversación actual.

## Árbol

```
.
├── README.md                      # Estado de fases + índice de docs
├── .env                           # ÚNICA fuente de verdad (gitignored). Contenido real de secretos.
├── .env.example                   # Plantilla canónica (commiteada, sin secretos)
├── app/                           # App Router (landing + staff/agenda/proyectos/historia)
├── components/                    # Componentes React (tonfort/ + ui/ de shadcn)
├── lib/                           # lógica pura (contact.ts, citas-service.ts, etc.)
├── hooks/                         # hooks de React
├── styles/                        # estilos globales
├── content/                       # contenido estático (p. ej. historia.ts)
├── public/                        # imágenes estáticas
├── scripts/                       # scripts utilitarios (p. ej. migrate-staff-hash.mjs)
├── tests/                         # tests unitarios (vitest)
├── infra/                         # Hub de despliegue (NO dueño del .env)
│   ├── scripts/                   # Scripts VPS (vps-deploy, vps-stop, vps-status, vps-reset, vps-logs, vps-shell, dns_cloudflare)
│   ├── Caddyfile                  # Reverse proxy + TLS (referenciado por compose como ./Caddyfile)
│   └── docker-compose.yml         # Stack: carpinteria-web + caddy
└── docs/                          # Documentación transversal
```

> **Unificación de entorno:** `.env` y `docker-compose.yml` viven en la **raíz**.
> `infra/` contiene solo el `Caddyfile`, el compose y los `scripts/`. La app consume
> `NEXT_PUBLIC_*` derivadas de `CARPINTERIA_*` dentro del `.env` raíz. Para desarrollo
> local del front sin Docker, `.env.local` repite los valores reales de la raíz
> (Next.js no expande `${VAR}`).

## Reglas de ubicación

- **Rutas** → `app/` (App Router). Cada dominio (staff, agenda, proyectos, historia)
  tiene su layout propio.
- **Server Actions** → `lib/actions/` (un archivo por dominio).
- **Componentes shared** → `components/ui/` (primitivas sin conocimiento de dominio).
- **Componentes de dominio** → `components/{staff,tonfort,...}/`.
- **Lógica pura** (validadores, normalizadores, regex) → `lib/*.ts` fuera de `actions/`
  y **sin** `'use client'`.
- **Tests unitarios** → `tests/` (vitest).
- **Infra**: `Caddyfile`, `docker-compose.yml` y `scripts/` en `infra/`. El `.env` de
  secretos está en la **raíz**, no en `infra/`.

## Convenciones transversales

- Ningún secreto en el repo: `.env`, keys y passwords solo en entorno/gestor de secretos.
- Path alias canónico: `@/*` → raíz del repo (definido en `tsconfig.json`).
- El esquema de datos vive en Supabase (ver `.env` `CARPINTERIA_SUPABASE_*`); este repo
  no contiene el SQL del esquema.

## Fases

- **F0** documentación y entorno base — completado.
- **F1** infra de despliegue (Caddy) — completado.
- **F2/F3** conexión a BD + lógica de negocio de carpintería — completado.
- **F4** landing + panel de staff (agenda, proyectos, citas) — completado.
- **F5** separación en repos independientes: este repo es solo carpintería; el SaaS + n8n
  quedaron en el repo hermano `tonfort-atencion`.
