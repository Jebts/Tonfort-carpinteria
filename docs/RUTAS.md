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

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component | Landing (hero, servicios, historia, galería, proceso, CTA, footer) |
| `/portafolio` | Server Component | Portafolio (proyectos con `publicado = true`) |
| `/portafolio/proyectos/[slug]` | Server Component | Detalle de proyecto del portafolio |
| `/portafolio/proyectos/[slug]/productos/[productoId]` | Server Component | Detalle de producto y sus propuestas públicas |
| `/portafolio/proyectos/[slug]/productos/[productoId]/propuestas/[propuestaId]` | Client Component | Visor interactivo `VideoViewer` de la propuesta |
| `/propuestas/[token]` | Client Component | Enlace privado no listado para cliente (`VideoViewer`) |
| `/historia` | Server Component | Narrativa de marca y filosofía |
| `/agenda` | redirect 302 | Redirige a `/agenda/paso-1` |
| `/agenda/paso-1` | Client Component | Selección de diseñador |
| `/agenda/paso-2` | Client Component | Selección de modalidad y costo |
| `/agenda/paso-3` | Client Component | Calendario y reserva de cita |
| `/agenda/confirmacion` | Server Component | Confirmación de reserva de cita |
| `/staff/login` | Client Component | Login de staff (exento de middleware) |

## API Route Handlers

### Públicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/citas?desde=&hasta=` | Disponibilidad (slots vacíos + `en_espera`/`aceptada`) |
| `POST` | `/api/citas` | Crea cita `en_espera` (origen `web`) + cliente asociado |
| `GET` | `/api/public/portafolio/proyectos` | Lista de proyectos publicados |
| `GET` | `/api/public/portafolio/proyectos/[slug]` | Detalle de proyecto por slug |
| `GET` | `/api/public/portafolio/proyectos/[slug]/productos` | Productos de un proyecto publicado |
| `GET` | `/api/public/portafolio/proyectos/[slug]/productos/[productoId]/propuestas/[propuestaId]` | Propuesta pública con animaciones |
| `GET` | `/api/public/propuestas/[token]` | Propuesta privada por token con animaciones |

### Staff (requieren auth via `proxy.ts` y control por rol)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/api/staff/login` | — | Valida credenciales en BD y firma cookie HMAC |
| `POST` | `/api/staff/logout` | — | Limpia cookie de sesión |
| `POST` | `/api/staff/ai-suggest` | any staff | Asistente IA (redacción de portafolio) |
| `GET`/`POST` | `/api/staff/clientes` | admin\|asesor | Lista / crea clientes |
| `GET`/`PUT`/`DELETE` | `/api/staff/clientes/[id]` | admin\|asesor | Lee / edita / elimina cliente |
| `GET`/`POST` | `/api/staff/citas` | admin\|asesor | Lista / crea cita interna |
| `PATCH`/`PUT`/`DELETE` | `/api/staff/citas/[id]` | admin\|asesor | Acciones `aceptar`/`cancelar`/`mover`/`eliminar`/`reenviar` |
| `GET`/`POST` | `/api/staff/usuarios` | admin | Lista y crea usuarios staff |
| `GET`/`PUT`/`DELETE` | `/api/staff/usuarios/[id]` | admin | Edita o desactiva usuario staff |
| `GET`/`POST` | `/api/staff/proyectos` | admin | Lista / crea proyectos de portafolio |
| `GET`/`PUT`/`DELETE` | `/api/staff/proyectos/[id]` | admin | Lee / edita / elimina proyecto |
| `GET`/`POST` | `/api/staff/diseno/proyectos` | admin\|disenador | Lista proyectos para diseño |
| `GET`/`PUT`/`DELETE` | `/api/staff/diseno/proyectos/[id]` | admin\|disenador | Detalle de proyecto |
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

## Estados de cita

- `vacio` → slot sin fila (calculado desde `lib/agenda.ts`).
- `en_espera` → solicitada; el público puede volver a pedir el mismo slot.
- `aceptada` → confirmada; el público no la mueve.
- `cancelada` → oculta para el público; visible solo en staff Agenda.
- `movida` → flag sobre cualquier cita reprogramada; `fecha_hora_anterior` guarda la original.

`PATCH /api/staff/citas/[id]` body:
```json
{ "accion": "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar", "fecha_hora"?: "ISO" }
```
