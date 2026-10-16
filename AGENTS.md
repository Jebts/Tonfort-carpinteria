# Contexto del proyecto Tonfort

Este repo es la **app de carpintería Tonfort** (Next.js 16 App Router + Supabase
single-tenant). Antes de trabajar, lee en orden:

1. `docs/00_contexto_general.md` — qué es, glosario, vars de entorno
2. `docs/01_reglas_negocio.md` — roles, estados, agenda, cotizaciones
3. `docs/02_modelo_datos.md` — entidades y relaciones (incluye inconsistencia types.ts vs migrations)
4. `docs/03_design_system.md` — tokens visuales extraídos de `app/globals.css`
5. `docs/04_arquitectura.md` — stack, estructura de carpetas, convenciones de código
6. `docs/05_auditoria.md` — inventario de archivos, código muerto, desviaciones

## Reglas no negociables

- Respeta la estructura de carpetas definida en `docs/04_arquitectura.md`.
- Usa los tokens de `docs/03_design_system.md` en toda la UI (`app/globals.css` es la fuente de
  verdad).
- Nunca inventes campos/entidades no definidos en `docs/02_modelo_datos.md`.
- **Route Handlers** en `app/api/`, no Server Actions. No existe `lib/actions/`.
- Imports con alias `@/` únicamente (definido en `tsconfig.json`).
- TypeScript estricto (`strict: true`). No usar `any`.
- Las `NEXT_PUBLIC_*` son build-time; el resto es runtime via `.env`.
- `proxy.ts` (raíz) protege `/staff/*` y `/api/staff/*`.
- `infra/` es solo despliegue. El código de la app no importa nada desde `infra/`.
- `cotizacion/` es una herramienta standalone pendiente de extracción a repo independiente.
- `docs/planificacion-3D/` contiene planificación aspiracional (no implementado). No tratar como
  fuente de verdad del código actual.

## Comandos

```bash
npm run dev         # Next.js dev server
npm run build       # Build de producción
npm run start       # Servidor de producción
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run db:check   # Verifica tablas en Supabase
npm run db:reinit  # Reset + seed demo + carga portafolio Bogotá (idempotente)
npm run db:seed    # TRUNCATE + seed demo
```

## Ver también

- `docs/RUTAS.md` — contrato de rutas y backend
- `docs/Organigrama.md` — flujo de despliegue
- `docs/README.md` — índice de documentación
- `docs/planificacion-3D/` — docs de planificación del módulo 3D (no existen en el repo; plan aspiracional)
