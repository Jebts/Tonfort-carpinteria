# Tonfort — Carpintería Artesanal (Plataforma Web & Panel Staff)

Next.js 16 (App Router) + React 19 + Supabase (single-tenant) para el sitio web y taller de diseño de carpintería artesanal de melamina con iluminación integrada.

Incluye:
- **Landing pública**: servicios, narrativa de marca, portafolio de proyectos y contacto.
- **Portafolio interactivo**: visor de video fluido (`VideoViewer`) con bucles sincronizados, punto de reposo frontal y clips interactivos de detalle.
- **Enlace privado de propuesta**: `/propuestas/[token]` accesible sin login con token criptográfico seguro para clientes.
- **Agenda pública de citas**: reserva en bloques de 2 horas (lunes a sábado) con selección de asesor y modalidad.
- **Panel de staff por roles**:
  - *Administración* (`/staff/administracion`): gestión de usuarios, portafolio, publicación y proyectos.
  - *Gestión comercial* (`/staff/gestion`): agenda, citas y clientes.
  - *Taller de diseño* (`/staff/diseno`): productos, propuestas de video y clips de animación interactiva.
- **Asistente de IA**: generación y redacción asistida de textos de portafolio (LLM configurable: mock / groq / openai).

## Stack Tecnológico

- **Frontend & Backend**: Next.js 16 (App Router, Route Handlers) / React 19 / TypeScript estricto
- **Estilos**: Tailwind CSS v4 + tokens de diseño en `app/globals.css` + shadcn/ui
- **Base de Datos**: Supabase Postgres single-tenant con RLS y triggers de auditoría
- **Almacenamiento**: Supabase Storage (bucket `visores-video`)
- **Autenticación**: Cookie de sesión HMAC (`SESSION_SECRET`) validada contra tabla `usuarios` (hash scrypt)
- **Infraestructura**: Caddy (reverse proxy + TLS automático Let's Encrypt) + Docker multi-stage

## Documentación

- `docs/README.md` — Índice maestro de documentación
- `docs/00_contexto_general.md` — Contexto general, glosario y variables de entorno
- `docs/01_reglas_negocio.md` — Roles, permisos, estados de propuesta y agenda
- `docs/02_modelo_datos.md` — Esquema de las 8 tablas activas, relaciones y triggers
- `docs/03_design_system.md` — Tokens visuales y componentes
- `docs/04_arquitectura.md` — Stack, convenciones, pipeline de video y estructura
- `docs/05_auditoria.md` — Inventario, métricas de calidad y migración
- `docs/RUTAS.md` — Contrato de rutas públicas y API Route Handlers
- `docs/10_Sitemap_y_Rutas.md` — Árbol de navegación y matriz de acceso
- `AGENTS.md` — Guía maestra para agentes de IA

## Comandos

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción (Next.js Turbopack)
npm run start      # Iniciar servidor de producción
npm run lint       # ESLint
npm run typecheck  # TypeScript (tsc --noEmit)
npm test           # Vitest (suite completa de pruebas)
npm run db:check   # Verificación de tablas y buckets en Supabase
npm run db:seed    # Reset y seed de datos demo
```

## Variables de Entorno

Copia `.env.example` a `.env` y completa los valores:

- **Públicas (build-time):** `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_HANDLE`, `NEXT_PUBLIC_EMAIL`
- **Backend Supabase (runtime):** `CARPINTERIA_SUPABASE_URL`, `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY`, `CARPINTERIA_SUPABASE_ANON_KEY`
- **Auth Staff:** `SESSION_SECRET`
- **LLM:** `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`
- **Infra / VPS:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_PORT`, `VPS_SSH_KEY`, `VPS_REMOTE_DIR`, `DOMAIN`, `CADDY_EMAIL`

## Despliegue

```bash
# 1. Configura DNS: carpinteria.{DOMAIN} -> IP del VPS
# 2. cp .env.example .env y completa valores reales
# 3. bash infra/scripts/vps-deploy.sh
```
