# Organigrama del proyecto TonFort (carpintería)

Mapa de flujo de datos y reglas de comunicación de **este repo** (`tonfort`,
carpintería). Tras la separación en repos independientes, este repo contiene
**solo** la app de carpintería; el SaaS + n8n viven en el repo hermano
`tonfort-atencion`.

## Diagrama de flujo (producción)

```
                       Cloudflare DNS (grey-cloud, A record)
                       carpinteria . tonfort.com  →  IP pública del VPS
                                     │
                                     ▼
                          ┌──────────────────────────┐
                          │  Caddy  (TLS Let's Encrypt)│   puertos 80 + 443
                          │  infra/Caddyfile           │   HTTP→HTTPS automático
                          └──────────────────────────┘
                               │ reverse_proxy
                               ▼
                        carpinteria-web:3001
                        (app Next.js en la RAÍZ del repo)
                        100% estática / server-rendered
```

> El SaaS y n8n se despliegan en un VPS distinto desde el repo `tonfort-atencion`
> (`saas.{DOMAIN}` + `n8n.{DOMAIN}`). Cada repo se despliega y rueda de forma
> independiente; no hay compose concatenado entre ambos.

## Reglas de comunicación (fuente de autoridad)

1. **`app/`, `components/`, `lib/` son la app de carpintería** y viven en la raíz.
   El alias canónico `@/*` resuelve a la raíz del repo (ver `tsconfig.json`).
2. **`infra/` es el único punto de despliegue** (Caddy + compose + scripts). Nada
   dentro de `app/`/`lib/`/`components/` referencia rutas de `infra/` en código.
3. **`infra/scripts/*`** lee su única fuente de verdad de vars/secretos del `.env`
   raíz.
4. **DNS por subdominio (grey-cloud) + Caddy** enruta `carpinteria.{DOMAIN}`.
