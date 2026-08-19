# Carpintería Tonfort — Contrato de rutas y backend

App Next.js (App Router) que corre con `next start` (serverful). El backend es un
**Supabase propio, single-tenant**, accedido solo desde Route Handlers con `service_role`.
El navegador NO habla directo con Supabase (la única policy `anon` es `SELECT` a
`proyectos` donde `publicado = true`).

## Variables de entorno (runtime, en el contenedor)

| Variable | Uso |
|---|---|
| `CARPINTERIA_SUPABASE_URL` | URL del proyecto Supabase |
| `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY` | Escritura/lectura server-side (Route Handlers) |
| `CARPINTERIA_SUPABASE_ANON_KEY` | Solo SELECT de proyectos públicos |
| `STAFF_CREDENTIALS` | JSON `[{usuario,password,nombre}]` (planas, no Supabase Auth) |
| `SESSION_SECRET` | Firma HMAC de la cookie `tonfort_staff` |

Las `NEXT_PUBLIC_*` (WhatsApp/IG/email) se hornean en build vía build args.

## Rutas públicas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/proyectos` | Server Component | Portafolio (proyectos `publicado`), reveal + luz/sombra |
| `/historia` | Server Component | Narrativa familiar cálida (cremas/ámbar) |
| `/agenda` | Client Component | Agenda pública: toggle Semanal/Mensual, dialog de reserva |
| `/staff/login` | Client Component | Login de staff (exento de middleware) |

## API Route Handlers

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/citas?desde=&hasta=` | público | Disponibilidad (slots vacíos + `en_espera`/`aceptada`; nunca `cancelada`) |
| `POST` | `/api/citas` | público | Crea cita `en_espera` (origen `web`) + cliente asociado |
| `POST` | `/api/staff/login` | público | Valida `STAFF_CREDENTIALS` y firma cookie |
| `POST` | `/api/staff/logout` | staff | Limpia cookie |
| `GET`/`POST` | `/api/staff/clientes` | staff | Lista / crea clientes |
| `GET`/`PUT`/`DELETE` | `/api/staff/clientes/[id]` | staff | Lee / edita / elimina cliente |
| `GET`/`POST` | `/api/staff/citas` | staff | Lista (slots+citas) / crea cita (origen `interna`) |
| `PATCH`/`PUT`/`DELETE` | `/api/staff/citas/[id]` | staff | Acciones `aceptar`/`cancelar`/`mover`/`eliminar` / edita / borra |
| `GET`/`POST` | `/api/staff/proyectos` | staff | Lista / crea proyectos |
| `GET`/`PUT`/`DELETE` | `/api/staff/proyectos/[id]` | staff | Lee / edita / elimina proyecto |

`PATCH /api/staff/citas/[id]` body: `{ "accion": "aceptar" | "cancelar" | "mover" | "eliminar", "fecha_hora"?: "ISO" }`.
`eliminar` solo permitido si la cita está `cancelada` o `en_espera`.

## Estados de cita

- `vacio` → slot sin fila (calculado desde `lib/agenda.ts`).
- `en_espera` → solicitada; el público puede volver a pedir el mismo slot.
- `aceptada` → confirmada; el público no la mueve.
- `cancelada` → oculta para el público; visible solo en staff Agenda.
- `movida` → flag sobre cualquier cita reprogramada; `fecha_hora_anterior` guarda la original.

## Migración

- `db/sql/esquema_carpinteria.sql` — tablas `clientes`, `citas`, `proyectos` + RLS.
- `db/sql/seed_demo.sql` — proyectos demo + 1 cliente/cita de ejemplo.
