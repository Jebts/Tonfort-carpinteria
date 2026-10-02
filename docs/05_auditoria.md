# Tonfort — Auditoría de código

Documento de auditoría técnica que consolida el inventario de archivos, la evolución arquitectónica hacia la plataforma de video interactivo (video-only) y el estado final de calidad.

> **Alcance de la última revisión (Ola 2 y Ola 3 del plan
> `.kilo/plans/1790962704620-cierre-refactor-espacio-publico.md`, commit `3f11d1b`):** inventario
> de archivos y limpieza del espacio público. Ver §4 (limpieza) y §5 (pendientes abiertos).

## 1. Inventario de archivos por directorio

### Raíz
```
AGENTS.md                 — Entrada maestra para agentes IA
CLAUDE.md                 — Apunta a AGENTS.md
CONTRIBUTING.md           — Guía de contribución
Dockerfile                — Multi-stage build (Next.js prod)
README.md                 — README raíz del proyecto
.env.example              — Plantilla de variables (sin secretos)
.env                      — Secretos reales (gitignored)
.gitignore                — .env*, node_modules, .next/, .next.stale-*/, .DS_Store
next.config.mjs           — Config: body size 100mb, headers de seguridad, imágenes
eslint.config.mjs         — ESLint flat config
postcss.config.mjs        — PostCSS (Tailwind v4)
components.json           — Config de shadcn/ui
proxy.ts                  — Next.js middleware (protege /staff/* y /api/staff/*)
middleware.ts             — Re-exports proxy.ts (entry point Next.js)
tsconfig.json             — Strict mode, alias @/ → raíz
vitest.config.ts          — Configuración Vitest con soporte dom/node
cotizacion/               — Herramienta standalone del módulo histórico (pendiente de extraer)
fotos_proyectos_anntiguos/ — 41 fotos sin clasificar — HOLD abierto, ver §5
```

### `app/`
```
layout.tsx                — Root layout (fuentes Google, ThemeProvider, Analytics)
page.tsx                  — Landing pública (hero, 2 LandingVisor, luz, proyectos, equipo, CTA agenda)
globals.css               — Design tokens + utilities
sede/                     — Página de la sede (datos de lib/contact.ts, mapa)
agenda/                   — Agenda pública: layout claro + flujo de 2 pasos
  modalidad/              — Paso 1: modalidad (virtual / presencial)
  horario/                — Paso 2: calendario y reserva
  solicitud-recibida/     — Confirmación de la reserva
  paso-1|2|3/, confirmacion/ — Route Handlers legacy: 301 a /agenda/modalidad
historia/page.tsx         — Historia de la marca
portafolio/
  page.tsx                — Alias → /portafolio/santa-marta
  [sede]/page.tsx         — Catálogo por sede, con filtro ?categoria=
  [sede]/[slug]/page.tsx  — Ficha plana: portada, galería, visor opcional
propuestas/[token]/       — Enlace privado cliente para visualización de propuestas de video
cotizaciones/[token]/     — Vista pública de la cotización por token
proyectos/page.tsx        — Alias legacy → /portafolio
sitemap.ts                — 6 URLs estáticas
staff/                    — Panel staff por roles (administracion, gestion, diseno) + aliases legacy
api/                      — Route Handlers exclusivamente (sin Server Actions)
  citas/                  — Disponibilidad y reserva pública
  public/                 — portafolio/**, visores-landing, propuestas/[token]
  staff/                  — auth, clientes, citas, usuarios, diseno/**, administracion/**
  cotizaciones|materiales|proyectos/ — Handlers ARCHIVADOS del módulo histórico (404)
```

### `components/`
```
theme-provider.tsx        — next-themes provider
tonfort/                  — Componentes de dominio (VideoViewer, agenda, portafolio, landing)
  landing/                — Secciones de la landing (hero, luz, proyectos-recientes, equipo, agenda-cta)
  agenda/                 — Flujo público de cita (selector de modalidad, calendario)
  staff/                  — cliente-form.tsx, proyecto-fotos.tsx, visores-landing-editor.tsx
ui/                       — Primitivas shadcn/ui (~60 componentes, incluidos select y sonner)
```

### `lib/`
```
supabase/
  server.ts               — Cliente Supabase server-only (service_role y anon)
  types.ts                — Tipos de dominio + catálogos cerrados (SEDES, CATEGORIAS_MUEBLE, SLUG_SEDE)
auth-core.ts              — HMAC, firma y verificación de cookies, scrypt hashing
auth-db.ts                — Acceso a credenciales en BD
staff-auth.ts             — Helpers Next.js (requireStaff, requireRol, getSesionServer)
staff-client.ts           — Cliente API fetch para staff
citas-service.ts          — Servicio de citas y agenda (tabla "citas") + modalidades
agenda.ts / agenda-format.ts — Slots, bloques horarios y formato de fecha/hora
portfolio-service.ts      — Servicio de portafolio público (filtros sede/categoría, visores de landing)
proyectos-service.ts      — Servicio de proyectos del panel de diseño
categorias.ts             — Catálogo de categorías, copy y type guard
cotizaciones-service.ts / cotizaciones-publicas-service.ts / validators-cotizaciones.ts — Módulo de cotizaciones
storage.ts                — Upload en buckets visores-video y portafolio-imagenes
contact.ts                — Datos de la sede + flag SEDE_PENDIENTE_DATOS
diseno-access.ts          — Control de acceso al taller de diseño
estados.ts                — Etiquetas y helpers de estado
rate-limit.ts             — Límite de peticiones en endpoints públicos
server-origin.ts          — Origen absoluto para llamadas server→server
csv-parser.ts / generador-word.ts / rate-limit.ts — Utilidades del módulo histórico
llm.ts                    — Asistente de IA para portafolio
validators.ts             — Schemas Zod de entrada (proyectoSchema, citaStaffSchema, CATEGORIAS_MUEBLE_SCHEMA)
errors.ts                 — Manejo centralizado y sanitización de errores
utils.ts                  — cn() y utilidades
```

### `hooks/`
```
use-mobile.ts             — Media query como hook
use-toast.ts              — Sistema de toasts
use-viewer-sequence.ts    — Secuencia de clips del VideoViewer
```

### `supabase/migrations/` (7 archivos)
```
20260919000000_init_clean_schema.sql         — DDL de las tablas activas; elimina 15 legacy
20260919000001_triggers_and_functions.sql    — Triggers de updated_at, slug y validación de propuesta
20260921000002_animacion_seleccionada.sql    — propuestas_3d_animaciones.seleccionada
20260922000000_cotizaciones.sql              — Tabla cotizaciones + columnas en propuestas_3d
20260922000001_cotizaciones_derivadas.sql    — Tablas derivadas + proyectos.cliente_id nullable
20260923000000_fix_citas_table_name.sql       — Renombra cites → citas  ⚠️ NO APLICADA
20260924000000_espacio_publico.sql            — Espacio público completo           ⚠️ NO APLICADA
```

### `infra/scripts/`
```
check-tables.js           — Verifica 11 tablas, 15 legacy eliminadas y el bucket visores-video
reset-and-seed.js         — TRUNCATE + seed demo (sube los vídeos de public/ al bucket)
seed-admin.ts             — Crea el primer usuario admin
vps-deploy.sh             — Despliegue en VPS
vps-reset.sh, vps-shell.sh, vps-status.sh, vps-stop.sh, vps-logs.sh — Utilidades de operación
dns_cloudflare.sh         — DNS
```

---

## 2. Métricas de calidad

Baseline registrado al abrir el plan de cierre del refactor (ver §5.1 para las salvedades):

| Métrica / Comando | Resultado | Estado |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | 0 errores | ✅ Aprobado |
| `npx vitest run` | 47 archivos de test, 296 pruebas, todas pasan | ✅ Aprobado |
| `npm run build` (Next.js 16 Turbopack) | OK, 51 páginas | ✅ Aprobado |
| `npm run lint` (repo entero) | **0 errores, 103 warnings** | ✅ Aprobado |

El repo **no tiene deuda de lint.** La cifra de "~26 533 errores" que circulaba en el plan de
cierre era un artefacto de medición, no código: provenía del directorio obsoleto
`.next.stale-110852/` (870 MB de JavaScript generado por webpack que nadie ignoraba, porque
`eslint.config.mjs` solo excluía `**/.next/` y no `**/.next.stale-*/`). ESLint escaneaba sus
chunks y reportaba un `no-undef` por cada símbolo generado. Ese directorio se borró en la Ola 2
y `**/.next.stale-*/` quedó añadido a los `ignores` de ESLint, de modo que la medición ya
refleja el código real.

`npm run db:check` queda fuera de esta tabla: 7 de 11 tablas OK y 4 `✗ FALTA` hasta que se
apliquen las migraciones pendientes (ver `docs/02_modelo_datos.md` §7).

---

## 3. Estado de la Migración a Plataforma de Video

1. **Eliminación de Three.js del flujo activo**:
   - Modelos `.glb` eliminados de `public/models/` (la carpeta queda vacía).
   - `process-demo-3d.tsx` archivado y luego eliminado junto con `components/tonfort/legacy/`.
   - Reemplazo completo por `VideoViewer` (HTML5 Video con bucle sincronizado, punto de reposo en `frame_centro_ms` y triggers de clips de movimiento/acción).
2. **Corrección de Nomenclatura Crítica**:
   - Se corrigió el bug de sustitución inadvertida (`cites` → `citas`) en servicios, handlers, scripts y tests. La tabla en la BD real **sigue** llamándose `cites`: la migración que la renombra (`20260923000000`) nunca se aplicó. Ver §5.2.
3. **Módulo de Cotizaciones**:
   - El flujo activo está integrado en `app/api/staff/administracion/cotizaciones/` y `app/api/cotizaciones/link/[token]/`.
   - `propuestas_3d.cotizacion_id`, `precio_cotizacion` y `seleccionada_por_cliente` conectan las propuestas con la cotización.
   - La vista de administración permite crear cotizaciones, asociar propuestas, definir precios y revisar selecciones.
   - El módulo histórico de costeo técnico en `cotizacion/` permanece aislado y no forma parte del flujo activo; sus Route Handlers están archivados y responden `404`.
4. **Refactor del espacio público (Olas 1-2 del plan de cierre)**:
   - Portafolio público **plano y por sede**: `/portafolio/[sede]` y `/portafolio/[sede]/[slug]`. Se eliminó todo el subárbol `/portafolio/proyectos/**`.
   - Agenda pública **de 2 pasos**: `/agenda/modalidad` → `/agenda/horario` → `/agenda/solicitud-recibida`, con las 4 rutas viejas conservadas como 301.
   - Panel de administración del portafolio con `sede`, `categoria`, `portada_url` y galería de fotos (`proyectos_fotos`), con endpoints `GET`/`POST` en `.../fotos` y `DELETE` en `.../fotos/[fotoId]`.
   - Editores de los visores de la landing (`visores_landing`) en `/staff/diseno/visores`.
   - `direccion` de la cita presencial rellenable desde `/staff/gestion/citas`.

---

## 4. Limpieza de la Ola 2

Todo lo siguiente **ya no existe** en el repositorio. No hay que buscarlo ni enlazarlo.

### Carpetas eliminadas

| Ruta | Tamaño aproximado | Nota |
|---|---|---|
| `nueva_UI_publica/` | 44 archivos, 42 MB | Prototipo de UI pública anterior al refactor |
| `lib/legacy/` | 3 módulos | `productos-service`, `cotizacion-3d-types`, `cotizacion-3d-mock` |
| `app/cotizacion/` | 1 archivo | `app/cotizacion/[token]/page.tsx`, un `redirect("/portafolio")` huérfano. **OJO:** `app/cotizaciones/` (con "s") **sí existe** y es la ruta viva de `/cotizaciones/[token]` |
| `components/tonfort/legacy/` | — | Componentes retirados del flujo activo |
| `.next.stale-110852/` | 870 MB | Solo del disco. `.gitignore` ya cubre `.next.stale-*/` |
| `de/`, `tonfort/` | — | Directorios vacíos espurios |

### Assets de `public/` eliminados

| Ruta | Tamaño | Nota |
|---|---|---|
| `public/images/` | 15 archivos, 15 MB | Material antiguo de imágenes |
| `public/light-detail-niche.png` | — | Textura de la sección de luz de la landing |
| `public/light-detail-edge.png` | — | Ídem |
| `public/light-detail-ceiling.png` | — | **NO se eliminó:** sigue en disco y `components/tonfort/landing/luz.tsx:55` lo referencia |
| `public/placeholder-logo.png` / `.svg` | — | Logos de relleno |
| `public/placeholder.jpg` / `.svg` | — | Placeholders genéricos |
| `public/tonfort-blue-fabric.mov` | 18 MB | Loop de tela |
| `public/tonfort-bubbles.mov` | 14 MB | Loop de burbujas |

### Código muerto eliminado

| Ruta | Nota |
|---|---|
| `components/tonfort/staff/cita-form.tsx` | Componente muerto: solo lo referenciaba su propio test. El nombre quedó libre para `tests/gestion-citas-direccion.test.tsx` |
| `tests/cita-form.test.tsx` | Test del componente anterior; eliminado con él |
| `public-animations.tsx`: `LightDetail`, `LightStory`, `PinnedExplorer`, `ProductHero`, `BlueFabricPerformance` | Exports sin ninguna referencia viva. El archivo conserva `Reveal`, `SideReveal`, `GradientText`, `WordReveal`, `ParallaxImage`, `CinematicBand`, `SectionHeading`, `PageHero`, `BAND_SEDE`, `ButtonLink` y `ProjectCard` |

### Assets de `public/` que se conservan (y por qué)

Estos parecían huérfanos en el plan original, pero están referenciados por código vivo:

| Ruta | Referencia |
|---|---|
| `public/tonfort-hero.mp4`, `public/tonfort-model-view.mp4` | `infra/scripts/reset-and-seed.js` los usa como `source:` para subir los vídeos demo de `npm run db:seed` |
| `public/videos/*.mp4` | Ídem (`hero-furniture-loop.mp4`, `process-inspection-loop.mp4`) |
| `public/tonfort-closet-render.png` | `FALLBACK_PORTADA` en `components/tonfort/public-data.ts` |
| `public/placeholder-user.jpg` | Base de los placeholders del equipo |
| `public/agenda/`, `public/sede/`, `public/equipo/` | Material **pendiente de la Fase 4** (fotos y vídeos reales). No son huérfanos |
| `public/history-*.{jpg,png}` (5) | Material real de archivo; son las únicas imágenes que apunta `content/historia.ts` |
| `public/light-detail-ceiling.png` | `components/tonfort/landing/luz.tsx:55` |
| `public/portfolio-kitchen-light.png`, `tonfort-hero-plant.png`, `tonfort-hero-wall.png` | Assets del diseño actual |

### Lo que NO se borró, deliberadamente

| Ruta | Motivo |
|---|---|
| `cotizacion/` (raíz) | Herramienta standalone. `AGENTS.md` la declara pendiente de extracción a repo independiente y el plan no la lista entre las huérfanas |
| `tests/proyectos-service.test.ts` | Test archivado; no importa código eliminado |
| `fotos_proyectos_anntiguos/` (41 fotos) | HOLD abierto. Ver §5.3 |
| `app/api/cotizaciones/**`, `app/api/materiales/**`, `app/api/proyectos/**` | Handlers archivados que responden `404`: son la frontera explícita del módulo histórico. Ver §5.4 |

---

## 5. Pendientes abiertos

### 5.1 Aviso de build

`metadataBase` no está configurado en los metadatos de la raíz. No es un error —el build pasa—
pero Next.js avisa por consola y las URLs absolutas de Open Graph y Twitter se resuelven contra
el origen del build en lugar del dominio canónico. Se arregla añadiendo `metadataBase` a
`app/layout.tsx` (o `NEXT_PUBLIC_SITE_URL` si se quiere externalizar).

Los 103 `warning` que quedan en `npm run lint` (imports sin usar, imports fuera de orden,
expresiones sin efecto) son preexistentes y no bloquean nada. Son deuda de menor gravedad y
queda fuera de alcance del refactor del espacio público.
`app/sitemap.ts` ya lee `NEXT_PUBLIC_SITE_URL` con fallback a `https://tonfort.co`.

### 5.2 Migraciones escritas pero no aplicadas ⚠️

`npm run db:check` contra la BD real da:

| Tabla | Estado |
|---|---|
| `usuarios`, `clientes`, `modalidades_cita`, `proyectos`, `productos`, `propuestas_3d`, `propuestas_3d_animaciones` | ✓ OK |
| `citas` | ✗ FALTA |
| `proyectos_fotos` | ✗ FALTA |
| `visores_landing` | ✗ FALTA |
| `visores_landing_animaciones` | ✗ FALTA |

Origen: la tabla se creó con el typo `cites`, y `20260923000000_fix_citas_table_name.sql` (la que
la renombra) nunca se aplicó. `20260924000000_espacio_publico.sql` tampoco, y **no puede
aplicarse antes que la primera** porque su `ALTER TABLE citas` fallaría.

Orden de aplicación y efectos esperados:

1. Aplicar `20260923000000_fix_citas_table_name.sql` (idempotente).
2. Aplicar `20260924000000_espacio_publico.sql` (idempotente: `IF NOT EXISTS` / `DROP ... IF EXISTS`).
3. `npm run db:check` → las 11 tablas deben dar ✓ OK y el bucket `portafolio-imagenes` debe existir.

Al aplicarlas:

- **La landing pierde las 2 secciones de visor.** `visores_landing` nace vacía (la migración solo
  siembra `modalidades_cita`) y `app/page.tsx` solo renderiza `LandingVisor` si el slot tiene
  fila. Se rellenan desde `/staff/diseno/visores`. **No es una rotura.**
- Los proyectos existentes salen como **"Sin categoría"**: `proyectos.categoria` es nullable sin
  default. `proyectos.sede` **sí** se rellena sola (`NOT NULL DEFAULT 'santa_marta'`).
- Las citas existentes se asignan a la modalidad `virtual` con `precio_copiado = 0`. No se borra
  ninguna.

### 5.3 HOLD — `fotos_proyectos_anntiguos/`

41 imágenes sin clasificar en la raíz del repo. El plan de la Ola 2 pedía copiar 8-10 fotos de
taller a `public/historia/` y borrar el resto. **No se hizo ninguna de las dos cosas.**

Motivo: el agente responsable no puede decidir con información suficiente cuáles son fotos de
taller reales y cuáles encuadran bien para el sitio. Borrarlas a ciegas es irreversible desde el
punto de vista del material (no del código).

Estado real:

- La carpeta sigue intacta con sus 41 archivos.
- `public/historia/` **no existe**.
- `content/historia.ts` sigue apuntando a las 5 imágenes que sí existen en `public/`:
  `/history-workshop-light.png`, `/history-founders.jpg`, `/history-installation.jpg`,
  `/history-family.jpg`, `/history-first-build.jpg`. Es material real de archivo y funciona.
- `/historia` se ve bien hoy. No hay nada roto.

Decisión pendiente del usuario: revisar las 41 fotos, elegir las que sirvan y decidir el
destino. Requiere criterio humano, no una tarea de agente.

### 5.4 Handlers archivados

`app/api/cotizaciones/**` (salvo `link/[token]`), `app/api/materiales/**` y `app/api/proyectos/**`
son 26 Route Handlers que responden `404` o lista vacía, marcados en el código con el
comentario `ARCHIVADO`. Son la frontera explícita del módulo histórico de costeo técnico: nadie
los llama y nadie debe llamarlos. Borrarlos es opcional y reduce ruido; dejarlos es más seguro si
algún enlace antiguo de despliegue apunta a ellos. Ver `docs/RUTAS.md` §API.

### 5.5 Pendiente de material real (Fase 4 del plan)

El sitio funciona con placeholders. Cuando el usuario entregue el material, aplicar:

1. `lib/contact.ts` — reemplazar los marcadores `<...>` y poner `SEDE_PENDIENTE_DATOS` en `false`.
   Ese flag es un `IIFE` que detecta los marcadores: no basta con borrar los strings.
2. `public/equipo/{santiago,natalia,esteban}.jpg` — fotos reales 800×1000.
3. `public/sede/` — `hero.png`, `poster-taller.png`, `video-taller.mp4`, `foto-1..3.jpg`.
4. `public/agenda/modalidades.mp4` + `modalidades-poster.png`.

Cada carpeta tiene su `README.md` con las medidas objetivo: leerlo antes de sustituir.
