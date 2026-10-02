# Organigrama del proyecto TonFort (carpintería)

Mapa de flujo de datos y reglas de comunicación de **este repo** (`tonfort`,
carpintería). Este repo contiene **solo** la app de carpintería (landing + panel staff).

## Diagrama de flujo (producción)

```
                        Cloudflare DNS (grey-cloud, A record)
                        carpinteria.{DOMAIN} → IP pública del VPS
                                      │
                                      ▼
                           ┌──────────────────────────┐
                           │  Caddy  (TLS Let's Encrypt)│   puertos 80 + 443
                           │  infra/Caddyfile           │   HTTP→HTTPS automático
                           └──────────────────────────┘
                                │ reverse_proxy
                                ▼
                    carpinteria-web (app Next.js en la RAÍZ del repo)
                    100% estática / server-rendered
```

## Reglas de comunicación (fuente de autoridad)

1. **`app/`, `components/`, `lib/` son la app de carpintería** y viven en la raíz.
   El alias canónico `@/*` resuelve a la raíz del repo (ver `tsconfig.json`).
2. **`infra/` es el único punto de despliegue** (Caddy + compose + scripts). Nada
   dentro de `app/`/`lib/`/`components/` referencia rutas de `infra/` en código.
3. **`infra/scripts/*`** lee su única fuente de verdad de vars/secretos del `.env`
   raíz.
4. **DNS por subdominio (grey-cloud) + Caddy** enruta `carpinteria.{DOMAIN}`.

## Separación de repos

Antes de la refactorización, este repo era un SaaS multi-tenant de automatización de
WhatsApp (n8n, Wompi, Google Calendar). Fue refactorizado a una app de carpintería
single-tenant. El SaaS + n8n viven en un repo hermano (`tonfort-atencion`), desplegado
de forma independiente. Este repo no contiene código SaaS.
