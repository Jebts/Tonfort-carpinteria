# Tonfort — Auditoría de código

Documento de auditoría técnica que consolida el inventario de archivos, la evolución arquitectónica hacia la plataforma de video interactivo (video-only) y el estado final de calidad.

## 1. Inventario de archivos por directorio

### Raíz
```
AGENTS.md                 — Entrada maestra para agentes IA
CLAUDE.md                 — Apunta a AGENTS.md
Dockerfile                — Multi-stage build (Next.js prod)
README.md                 — README raíz del proyecto
.env.example              — Plantilla de variables (sin secretos)
.env                      — Secretos reales (gitignored)
.gitignore                — .env*, node_modules, .next/, .DS_Store
next.config.mjs           — Config: body size 100mb, headers de seguridad, imágenes
package.json              — Scripts: dev, build, start, lint, test, typecheck, db:check, db:seed
proxy.ts                  — Next.js middleware (protege /staff/* y /api/staff/*)
middleware.ts             — Re-exports proxy.ts (entry point Next.js)
tsconfig.json             — Strict mode, alias @/ → raíz
vitest.config.ts          — Configuración Vitest con soporte dom/node
```

### `app/`
```
layout.tsx                — Root layout (fuentes Google, ThemeProvider, Analytics)
page.tsx                  — Landing pública
globals.css               — Design tokens + utilities
agenda/                   — Agenda pública (3 pasos + confirmación)
historia/page.tsx         — Historia de la marca
portafolio/               — Portafolio público (proyectos, productos, propuestas de video)
propuestas/[token]/       — Enlace privado cliente para visualización de propuestas de video
staff/                    — Panel staff por roles (administracion, gestion, diseno)
api/                      — Route Handlers exclusivamente (sin Server Actions)
```

### `components/`
```
theme-provider.tsx        — next-themes provider
tonfort/                  — Componentes de dominio (VideoViewer, Agenda, Portafolio, etc.)
  legacy/                 — Componentes retirados del flujo activo (process-demo-3d.tsx, etc.)
ui/                       — Primitivas shadcn/ui
```

### `lib/`
```
supabase/
  server.ts               — Cliente Supabase server-only (service_role y anon)
  types.ts                — Tipos limpios de las 8 tablas activas
legacy/                   — Archivo de librerías y utilidades deprecadas
auth-core.ts              — HMAC, firma y verificación de cookies, scrypt hashing
staff-auth.ts             — Helpers Next.js (requireStaff, requireRol, getSesionServer)
staff-client.ts           — Cliente API fetch para staff
citas-service.ts          — Servicio de citas y agenda (con tabla "citas")
portfolio-service.ts      — Servicio de portafolio público
storage.ts                — Upload y validación en bucket visores-video
llm.ts                    — Asistente de IA para portafolio
validators.ts             — Schemas Zod de entrada
errors.ts                 — Manejo centralizado y sanitización de errores
```

### `supabase/migrations/`
```
20260919000000_init_clean_schema.sql         — DDL limpio de las 8 tablas activas
20260919000001_triggers_and_functions.sql    — Triggers de updated_at, slug y validación
```

---

## 2. Métricas de Calidad y Suite de Pruebas

| Métrica / Comando | Resultado | Estado |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | 0 errores | ✅ Aprobado |
| `npm run lint` (ESLint) | 0 errores, 97 warnings (código legacy) | ✅ Aprobado |
| `npm test` (Vitest) | 51 suites, 266 pruebas pasadas (100%) | ✅ Aprobado |
| `npm run build` (Next.js 16 Turbopack) | Compilación exitosa, 43 páginas estáticas/dinámicas | ✅ Aprobado |
| `npm run db:check` | 8 tablas activas verificadas, bucket `visores-video` OK | ✅ Aprobado |

---

## 3. Estado de la Migración a Plataforma de Video

1. **Eliminación de Three.js del flujo activo**:
   - Modelos `.glb` eliminados de `public/models/`.
   - `process-demo-3d.tsx` archivado en `components/tonfort/legacy/`.
   - Reemplazo completo por `VideoViewer` (HTML5 Video con bucle sincronizado, punto de reposo en `frame_centro_ms` y triggers de clips de detalle o interacción).
2. **Corrección de Nomenclatura Crítica**:
   - Corrección del bug de sustitución inadvertida (`cites` → `citas`) en todos los servicios, handlers, scripts y tests de citas.
3. **Módulo de Cotizaciones**:
   - El flujo activo está integrado en `app/api/staff/administracion/cotizaciones/` y `app/api/cotizaciones/link/[token]/`.
   - `propuestas_3d.cotizacion_id`, `precio_cotizacion` y `seleccionada_por_cliente` conectan las propuestas con la cotización.
   - La vista de administración permite crear cotizaciones, asociar propuestas, definir precios y revisar selecciones.
   - El módulo histórico de costeo técnico en `cotizacion/` permanece aislado y no forma parte del flujo activo.
