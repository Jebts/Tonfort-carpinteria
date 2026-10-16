# Carpintería Tonfort — Contrato de rutas y backend

App Next.js (App Router) que corre con `next start` (serverful). El backend es un
**Supabase propio, single-tenant**, accedido desde Route Handlers con `service_role`.
El navegador NO habla directo con Supabase salvo SELECT público con RLS para proyectos publicados.

## Variables de entorno (runtime, en el contenedor)

| Variable | Uso |
|---|---|
| `CARPINTERIA_SUPABASE_URL` | URL del proyecto Supabase |
| `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY` | Escritura/lectura server-side (Route Handlers) |
| `CARPINTERIA_SUPABASE_ANON_KEY` | Solo SELECT de proyectos públicos |
| `SESSION_SECRET` | Firma HMAC de la cookie `tonfort_staff` |
| `LLM_PROVIDER` | `groq` / `openai` / `mock` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Configuración Groq |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Configuración OpenAI |

Las `NEXT_PUBLIC_*` (WhatsApp/IG/email) se hornean en build vía build args.

## Rutas públicas

Estado verificado sobre `app/` tras el refactor del espacio público (Ola 2 del plan
`.kilo/plans/1790962704620-cierre-refactor-espacio-publico.md`, commit `3f11d1b`).

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component | Landing (hero, luz, carrusel `VisoresCarousel`, proyectos recientes, equipo, CTA de agenda, footer) |
| `/sede` | Server Component | Página de la sede: ubicación, mapa, datos de contacto de `lib/contact.ts` |
| `/historia` | Server Component | Narrativa de marca y filosofía (`content/historia.ts`) |
| `/portafolio` | Server Component (`force-dynamic`) | Catálogo único con las dos listas: Santa Marta arriba y Bogotá abajo. Acepta `?categoria=<categoria_mueble>`; un valor fuera del catálogo cerrado cae en "Todos" |
| `/portafolio/[sede]` | redirect 308 | Redirige a `/portafolio` conservando `?categoria=`. Slugs válidos: `santa-marta`, `bogota` (cualquier otro es 404). El portafolio ya no se parte por sede |
| `/portafolio/[sede]/[slug]` | Server Component (`force-dynamic`) | Ficha plana del proyecto: portada a sangre, galería de `proyectos_fotos` y visor opcional. Sin datos de cliente ni de staff asignado |
| `/agenda` | redirect 307 | Redirige a `/agenda/modalidad` |
| `/agenda/modalidad` | Server Component | Paso 1: elección de modalidad (`virtual` / `presencial`) y del diseñador |
| `/agenda/horario` | Server Component | Paso 2: calendario y reserva. Exige `?modalidad=<slug>`; sin modalidad válida responde `404` |
| `/agenda/solicitud-recibida` | Server Component | Confirmación de la reserva. Lee `?modalidad=&fecha=&hora=` del query string |
| `/agenda/paso-1` | Route Handler | **Legacy**: 301 permanente a `/agenda/modalidad` |
| `/agenda/paso-2` | Route Handler | **Legacy**: 301 permanente a `/agenda/modalidad` |
| `/agenda/paso-3` | Route Handler | **Legacy**: 301 permanente a `/agenda/modalidad` |
| `/agenda/confirmacion` | Route Handler | **Legacy**: 301 permanente a `/agenda/modalidad` |
| `/propuestas/[token]` | Client Component | Enlace privado no listado para cliente (`VideoViewer`) |
| `/cotizaciones/[token]` | Server Component | Vista pública de la cotización por token; consume `/api/cotizaciones/link/[token]` en servidor |
| `/sitemap.xml` | Metadata route (`app/sitemap.ts`) | 6 URLs estáticas. Las páginas de proyecto son dinámicas y quedan fuera a propósito |
| `/staff/login` | Client Component | Login de staff (exento de middleware) |

Rutas del panel de staff (`/staff/**`) y sus aliases legacy en `docs/10_Sitemap_y_Rutas.md`.

### Alias eliminados

Ya **no existen** y no deben enlazarse desde ningún sitio:

- `/portafolio/proyectos/[slug]` y todo su subárbol `productos/**`. El portafolio público es
   ahora plano y la ficha vive en `/portafolio/[sede]/[slug]`.
- `app/cotizacion/` (sin "s") era un `redirect("/portafolio")` huérfano; se eliminó. La ruta viva
  de la vista pública de cotizaciones es `app/cotizaciones/[token]`.

## API Route Handlers

### Públicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/citas?desde=&hasta=&modalidad=<slug\|id>` | Disponibilidad. Sin `modalidad` muestra todos los slots; con ella el estado se resuelve solo sobre las citas de esa modalidad. Nunca expone `canceladas` ni datos de contacto |
| `POST` | `/api/citas` | Crea cita `en_espera` (origen `web`) + cliente asociado. Resuelve la modalidad por `slug`, copia `modalidades_cita.costo` a `precio_copiado` y `modalidades_cita.duracion_minutos` a `duracion_minutos` |
| `GET` | `/api/public/portafolio/proyectos?sede=&categoria=` | Lista plana de proyectos publicados. Los filtros se validan contra los catálogos cerrados: un valor desconocido se ignora. `revalidate = 300` |
| `GET` | `/api/public/portafolio/proyectos/[slug]` | Payload plano `{ proyecto, fotos, visor }` de la ficha pública. `404` si no está publicado. `revalidate = 300` |
| `GET` | `/api/public/visores-landing` | Visores activos de la landing con sus animaciones, sin datos de staff. `revalidate = 300` |
| `GET` | `/api/public/propuestas/[token]` | Propuesta privada por token con animaciones |
| `GET` | `/api/cotizaciones/link/[token]` | Vista pública de la cotización por token |
| `PATCH` | `/api/cotizaciones/link/[token]` | El cliente marca su selección de propuesta |

### Staff (requieren auth via `proxy.ts` y control por rol)

`proxy.ts` protege `/staff/:path*` y `/api/staff/:path*`; los dos únicos exentos son
`/staff/login` y `/api/staff/login`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/api/staff/login` | — | Valida credenciales en BD y firma cookie HMAC |
| `POST` | `/api/staff/logout` | — | Limpia cookie de sesión |
| `POST` | `/api/staff/ai-suggest` | any staff | Asistente IA (redacción de portafolio) |
| `GET`/`POST` | `/api/staff/clientes` | admin\|asesor | Lista / crea clientes |
| `GET`/`PUT`/`DELETE` | `/api/staff/clientes/[id]` | admin\|asesor | Lee / edita / elimina cliente |
| `GET`/`POST` | `/api/staff/citas` | admin\|asesor | Lista (`slots` + `citas` + `modalidades`) / crea cita interna (rechaza `estado: "aceptada"`, 422; cupo por modalidad y duración real) |
| `PATCH`/`PUT`/`DELETE` | `/api/staff/citas/[id]` | admin\|asesor | Acciones `aceptar`/`cancelar`/`mover`/`eliminar`/`reenviar` y edición de campos (`citaStaffSchema.partial()`, incluye `direccion`) |
| `GET`/`POST` | `/api/staff/usuarios` | admin | Lista y crea usuarios staff |
| `GET`/`PUT`/`DELETE` | `/api/staff/usuarios/[id]` | admin | Edita o desactiva usuario staff |
| `GET`/`POST` | `/api/staff/administracion/visores-landing` | admin | Lista los visores del carrusel con sus animaciones, ordenados por `orden` / crea un visor al final |
| `PATCH`/`DELETE` | `/api/staff/administracion/visores-landing/[id]` | admin | Edita (o reordena, con un `PATCH` de la sola clave `orden`) y elimina un visor |
| `GET`/`POST` | `/api/staff/administracion/visores-landing/[id]/animaciones` | admin | Lista y crea animaciones del visor |
| `POST` | `/api/staff/administracion/visores-landing/[id]/upload-global-video` | admin | Sube el video global del visor a `visores-video` |
| `GET`/`POST` | `/api/staff/diseno/proyectos` | admin\|disenador | Lista proyectos para diseño / crea proyecto de diseño |
| `GET`/`PATCH`/`DELETE` | `/api/staff/diseno/proyectos/[id]` | admin\|disenador | Detalle, edición y borrado de proyecto de diseño |
| `GET`/`POST` | `.../productos` | admin\|disenador | Lista y crea productos |
| `GET`/`PUT`/`DELETE` | `.../productos/[productoId]` | admin\|disenador | Detalle, edición y borrado de producto |
| `GET`/`POST` | `.../propuestas` | admin\|disenador | Lista y crea propuestas |
| `GET`/`PUT`/`PATCH`/`DELETE` | `.../propuestas/[propuestaId]` | admin\|disenador | Detalle, edición, estado y borrado |
| `POST`/`DELETE` | `.../propuestas/[propuestaId]/upload-global-video` | admin\|disenador | Subida y borrado de video global |
| `POST` | `.../propuestas/[propuestaId]/duplicar` | admin\|disenador | Duplica propuesta con sus animaciones |
| `POST` | `.../propuestas/[propuestaId]/link-privado` | admin\|disenador | Activa/desactiva enlace privado con token |
| `POST` | `.../propuestas/[propuestaId]/publicar-portafolio` | admin | Publica/despublica en portafolio público |
| `GET`/`POST` | `.../animaciones` | admin\|disenador | Lista y crea animaciones |
| `GET`/`PUT`/`DELETE` | `.../animaciones/[animacionId]` | admin\|disenador | Detalle, edición y borrado de animación |
| `POST`/`DELETE` | `.../animaciones/[animacionId]/upload-video` | admin\|disenador | Subida y borrado de video de animación |
| `GET` | `/api/staff/administracion/portafolio/proyectos` | admin | Lista de proyectos para el panel de publicación (solo lectura) |
| `PATCH`/`DELETE` | `/api/staff/administracion/portafolio/proyectos/[id]` | admin | Edita publicación (`titulo`, `descripcion`, `orden`, `publicado`, `sede`, `categoria`, `portada_url`) / borra el proyecto |
| `GET` | `/api/staff/administracion/portafolio/proyectos/[id]/fotos` | admin | Galería del proyecto ordenada por `orden` |
| `POST` | `/api/staff/administracion/portafolio/proyectos/[id]/fotos` | admin | Sube una foto (`multipart/form-data`, campos `file` y `alt` opcional). Valida con `validateImageUpload` (422), asegura el bucket `portafolio-imagenes`, inserta con `orden = max(orden) + 1` y responde `201 { foto }` |
| `DELETE` | `/api/staff/administracion/portafolio/proyectos/[id]/fotos/[fotoId]` | admin | Borra la fila y el objeto del bucket; si la foto era la portada, limpia `proyectos.portada_url` |
| `GET`/`POST` | `/api/staff/administracion/cotizaciones` | admin | Lista / crea cotizaciones |
| `GET` | `/api/staff/administracion/cotizaciones/[cotizacionId]` | admin | Detalle de la cotización |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/precio` | admin | Actualiza precios de cotización |
| `PATCH` | `/api/staff/administracion/cotizaciones/[cotizacionId]/seleccion` | admin | Actualiza selección de propuesta |
| `DELETE` | `/api/staff/administracion/cotizaciones/[cotizacionId]/productos/[cotizacionProductoId]` | admin | Quita un producto derivado |
| `DELETE` | `/api/staff/administracion/cotizaciones/[cotizacionId]/propuestas/[cotizacionPropuestaId]` | admin | Quita una propuesta derivada |

### Endpoints archivados (responden `404`, no forman parte del flujo activo)

`app/api/cotizaciones/**` (salvo `link/[token]`), `app/api/materiales/**` y
`app/api/proyectos/**` son stubs archivados del módulo histórico de costeo técnico. Cada
handler devuelve `404` o una lista vacía y está marcado en el código con el comentario
`ARCHIVADO`. No deben documentarse como functionality ni consumirse.

## Estados de cita

- `vacio` → slot sin fila (calculado desde `lib/agenda.ts`).
- `en_espera` → solicitada; el público puede volver a pedir el mismo slot.
- `aceptada` → confirmada; el público no la mueve.
- `cancelada` → oculta para el público; visible solo en staff Agenda.
- `movida` → flag sobre cualquier cita reprogramada; `fecha_hora_anterior` guarda la original.

El estado de cada slot se resuelve **por modalidad**: una cita `virtual` no bloquea el mismo
bloque para una cita `presencial`, y viceversa.

`PATCH /api/staff/citas/[id]` body:
```json
{ "accion": "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar", "fecha_hora"?: "ISO",
  "resolucion"?: [{ "id": "uuid", "accion": "mover" | "eliminar", "fecha_hora"?: "ISO" }] }
```

Confirmar (`aceptar`) cierra el bloque y obliga a resolver el resto de la misma `fecha_hora` +
`modalidad_id`:

- sin `resolucion` y con otras `en_espera` en el bloque → **422** con `{ error, pendientes: [{ id, nombre, fecha_hora }] }`
  (la UI abre `components/tonfort/agenda/dialogo-bloque.tsx`).
- `resolucion` que no cubre todas y ninguna extra → **422**.
- bloque con otra `aceptada`, o destino de una mudanza ocupado → **409** con `conflicto`.
- éxito → **200** `{ cita, resueltas }` (nº de en_espera movidas o eliminadas).

`POST /api/staff/citas` rechaza `estado: "aceptada"` con **422**: toda `aceptada` pasa por la
confirmación del bloque. El cupo se valida con la **duración real** (`duracion_minutos`, 120 por
defecto) y por modalidad. `GET /api/staff/citas` añade `modalidades` (catálogo activo) a la
respuesta.

Sin `accion`, el mismo handler valida el cuerpo con `citaStaffSchema.partial()` para editar
campos de la cita, entre ellos `direccion` (máx. 400 caracteres, nullable), `modalidad_id`,
`notas`, `telefono` y `descripcion`.

`GET /api/citas` y `GET /api/staff/citas` devuelven en cada slot los contadores `enEspera` y
`canceladas` (número de citas del bloque por estado, sin datos).

### La grilla de la agenda (público y staff comparten componente)

- `components/tonfort/agenda/grilla-bloques.tsx` es la retícula: 4 bloques (`BLOQUES`) × Lun–Sáb,
  con navegación anterior/siguiente/Hoy y el contenido de cada celda por `renderCelda` (children
  pattern). La usa `/agenda/horario` (público, vía `calendario.tsx`) y `/staff/gestion/agenda`.
- `lib/agenda.ts` concentra la aritmética UTC: `inicioSemana` (idempotente), `fechaDeCelda`,
  `celdasDeSemana` y `slotKey`. Staff ya no usa `startOfDay`/`endOfDay`/`isWithinInterval` en hora
  local: el rango que pide a la API es `desde = inicioSemana(lunes 00:00Z)`,
  `hasta = desde + 7 días`.
- En staff, la celda resume el bloque con círculos de contador y al hacer clic abre
  `components/tonfort/agenda/dialogo-bloque.tsx` (detalle de cada cita + confirmación/mover). El `+`
  solo aparece en bloques sin `aceptada`; en el público, `en_espera` **no** bloquea (solo
  `aceptada`). Las citas fuera de bloque se listan aparte (no entran en la regla de cupo).

## Aviso: esquema pendiente de aplicar

Las rutas de la Ola 2 (`.../proyectos/[id]/fotos[/[fotoId]]`, `/api/public/visores-landing`,
`/api/staff/administracion/visores-landing/**`) ya están en el código, pero **las tablas que usan no
existen todavía en la BD real**. `npm run db:check` devuelve `✗ FALTA` para `citas`,
`proyectos_fotos`, `visores_landing` y `visores_landing_animaciones`. Ver
`docs/02_modelo_datos.md` §7 y `docs/05_auditoria.md` §5.
