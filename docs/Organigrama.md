# Organigrama del proyecto TonFort

Mapa de flujo de datos y reglas de comunicación entre carpetas del repo. El objetivo de
esta reestructuración es que **cada capa sea autónoma** y el punto de despliegue sea único.

## Diagrama de flujo (producción)

```
                         Cloudflare DNS (grey-cloud, A records)
                         saas / carpinteria / n8n . tonfort.com
                                    │  (resuelven a la IP pública del VPS)
                                    ▼
                         ┌──────────────────────────┐
                         │  Caddy  (TLS Let's Encrypt)│   puertos 80 + 443
                         │  infra/Caddyfile           │   HTTP→HTTPS automático
                         └──────────────────────────┘
                              │ reverse_proxy por subdominio
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                       ▼
 carpinteria-web:3001   saas-web:3000           n8n:5678
 (apps/carpinteria)     (apps/saas)             (services/n8n)
 100% estática           Next.js + Supabase      orquestación + webhooks
                                              │
                                              │ webhooks HTTP (Meta/Wompi)
                                              ▼
                                        Supabase (fuera del repo)
                                        └─ Postgres: roles app_router / app_tenant, RLS
```

## Matriz "qué importa qué / qué no"

| Origen | Destino | ¿Permitido? | Medio |
|--------|---------|-------------|-------|
| `apps/saas` | `apps/carpinteria` | ❌ No | Son apps distintas y autónomas; no se importan entre sí. |
| `apps/carpinteria` | `apps/saas` | ❌ No | Idem. |
| `apps/*` | `services/n8n` | ❌ en build | Comunicación solo en runtime vía webhooks HTTP. |
| `services/n8n` | `apps/*` | ❌ en build | n8n resuelve tenant por `phone_number_id`, no por subdominio. |
| `infra/*` | `apps/*` / `services/*` | ❌ en código | `infra/` es solo despliegue (Caddy + compose + scripts). |
| `db/sql` | consumido por | ✅ solo scripts | `infra/scripts/` (reinit_db, verify_db) aplican el esquema. |
| `infra/scripts/*` | `.env` raíz | ✅ | Única fuente de verdad de secretos/vars. |

## Reglas de comunicación (fuente de autoridad)

1. **`apps/*` son autónomos.** No se importan entre sí. Cada app tiene su propio alias
   `@/*` resuelto relativo a su carpeta (`apps/saas/tsconfig.json`, `apps/carpinteria/tsconfig.json`).
 2. **`apps/saas/services/n8n` resuelve tenant por `phone_number_id`**, no por subdominio. No depende
    de `apps/*` en build; solo se comunica por webhooks HTTP en runtime.
 3. **`infra/` es el único punto de despliegue** (Caddy + compose + scripts). Nada dentro de
    `apps/*`/`services/*` debe referenciar rutas de `infra/` en código.
 4. **`apps/saas/db/sql` es fuente de verdad de esquema**; solo lo consumen scripts de `apps/saas/db/scripts/`.
5. **DNS por subdominio (grey-cloud) + Caddy** enruta `saas/carpinteria/n8n.{DOMAIN}`.
   La auth está aislada porque son subdominios distintos (cookies no compartidas entre ellos).

## Despliegue solo-Carpintería (perfiles)

Para el despliegue inicial en el VPS se usa el override `apps/carpinteria/infra/docker-compose.carpinteria.yml`,
que deja `saas-web` y `n8n` en `profiles: ["never"]` (en el compose base). Así
`docker compose --profile default up -d` levanta únicamente `carpinteria-web` + `caddy`:

```bash
docker compose -f infra/docker-compose.yml --profile default -f apps/carpinteria/infra/docker-compose.carpinteria.yml up -d
```

Para activar saas/n8n más adelante, usa el override `apps/saas/infra/docker-compose.saas.yml`
(o `bash infra/scripts/vps-deploy.sh --apps all`) y redeploy.
