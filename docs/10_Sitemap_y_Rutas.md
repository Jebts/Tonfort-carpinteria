# Tonfort — Sitemap y rutas

Árbol de rutas, entidades y matriz de permisos para el panel de staff y el sitio público.
Documenta la navegación role-based y el contrato de rutas de la plataforma de video interactivo.

## 1. Roles de staff

| Rol | Descripción | Sección principal |
|---|---|---|
| `admin` | Control total: proyectos, usuarios, portafolio, publicación y agenda. | `/staff/administracion` |
| `asesor` | Gestión comercial: agenda, citas, clientes y proyectos asignados. | `/staff/gestion` |
| `disenador` | Taller de diseño: proyectos, productos, propuestas de video y animaciones. | `/staff/diseno` |

Los roles viven en la tabla `usuarios` (campo `rol`). Las contraseñas se almacenan con hash scrypt en `password_hash`.

---

## 2. STAFF — Administración (`admin`)

Rutas bajo `/staff/administracion/*` (acceso exclusivo para `admin`).

| Nodo | Ruta | Entidad | Permiso |
|---|---|---|---|
| Dashboard Admin | `/staff/administracion` | `proyectos`, `clientes`, `citas`, `usuarios` | Lectura general |
| Proyectos | `/staff/administracion/proyectos` | `proyectos`, `clientes` | Lectura / Creación |
| Proyecto | `/staff/administracion/proyectos/:id` | `proyectos`, `productos`, `clientes` | Edición completa |
| Portafolio | `/staff/administracion/portafolio` | `proyectos`, `propuestas_3d` | Publicar / Despublicar |
| Usuarios | `/staff/administracion/usuarios` | `usuarios` | Crear / Editar / Desactivar |

---

## 3. STAFF — Gestión (`asesor` + `admin`)

Rutas bajo `/staff/gestion/*` (`asesor` y `admin`).

| Nodo | Ruta | Entidad | Permiso |
|---|---|---|---|
| Dashboard | `/staff/gestion` | `proyectos`, `citas` | Resumen comercial |
| Agenda | `/staff/gestion/agenda` | `citas`, `clientes` | Vista semanal/mensual |
| Citas | `/staff/gestion/citas` | `citas` | Aceptar / Mover / Cancelar |
| Clientes | `/staff/gestion/clientes` | `clientes` | CRUD de clientes |
| Proyectos | `/staff/gestion/proyectos` | `proyectos` | Consulta comercial |
| Proyecto | `/staff/gestion/proyectos/:id` | `proyectos` | Consulta de avance |

---

## 4. STAFF — Taller de Diseño (`disenador` + `admin`)

Rutas bajo `/staff/diseno/*` (`disenador` y `admin`).

| Nodo | Ruta | Entidad | Permiso |
|---|---|---|---|
| Dashboard | `/staff/diseno` | `proyectos`, `productos` | Proyectos de diseño |
| Proyectos | `/staff/diseno/proyectos` | `proyectos` | Selección de proyecto |
| Proyecto Detalle | `/staff/diseno/proyectos/:id` | `proyectos`, `productos` | Gestión de productos |
| Producto Detalle | `/staff/diseno/proyectos/:id/productos/:productoId` | `productos`, `propuestas_3d` | Listado de propuestas |
| Propuestas Lista | `/staff/diseno/proyectos/:id/productos/:productoId/propuestas` | `propuestas_3d` | Crear propuesta |
| Propuesta Editor | `/staff/diseno/proyectos/:id/productos/:productoId/propuestas/:propuestaId` | `propuestas_3d`, `propuestas_3d_animaciones` | Upload video global, frame centro, estado, link privado, publicar portafolio, animaciones |

---

## 5. SITIO PÚBLICO

| Nodo | Ruta | Entidad | R/E |
|---|---|---|---|
| Landing | `/` | — | Lectura |
| Historia | `/historia` | `content/historia.ts` | Lectura |
| Portafolio (lista) | `/portafolio` | `proyectos` (`publicado = true`) | Catálogo público |
| Portafolio [Proyecto] | `/portafolio/proyectos/:slug` | `proyectos`, `productos` | Detalle y piezas |
| Portafolio [Producto] | `/portafolio/proyectos/:slug/productos/:productoId` | `productos`, `propuestas_3d` | Propuestas disponibles |
| Portafolio [Visor Propuesta] | `/portafolio/proyectos/:slug/productos/:productoId/propuestas/:propuestaId` | `propuestas_3d`, `animaciones` | Visor `VideoViewer` |
| Enlace Privado Cliente | `/propuestas/:token` | `propuestas_3d`, `animaciones` | Visor `VideoViewer` privado |
| Agenda (entrada) | `/agenda` | — | 302 redirect a `/agenda/paso-1` |
| Paso 1 diseñador | `/agenda/paso-1` | `usuarios` (`rol='disenador' AND activo=true`) | Selección de asesor |
| Paso 2 modalidad | `/agenda/paso-2` | `modalidades_cita` | Selección de modalidad |
| Paso 3 calendario | `/agenda/paso-3` | `citas` (slots) | Reserva pública de cita |
| Confirmación | `/agenda/confirmacion` | `citas` | Confirmación de cita |

### Redirects públicos
- `/proyectos` → `/portafolio` (302)
- `/agenda` → `/agenda/paso-1` (302)

---

## 6. Matriz de Acceso y Middleware

| Ruta | Middleware (`proxy.ts`) | Server Check (Rol) | Notas |
|---|---|---|---|
| `/staff/login` | Exento | — | Login público para personal |
| `/staff/administracion/**` | Requiere cookie staff válida | `admin` (403 si asesor o diseñador) | Administración global |
| `/staff/gestion/**` | Requiere cookie staff válida | `admin`, `asesor` (403 si diseñador) | Gestión comercial |
| `/staff/diseno/**` | Requiere cookie staff válida | `admin`, `disenador` (403 si asesor) | Taller de diseño |
| `/api/staff/login` | Exento | — | Autenticación |
| `/api/staff/usuarios/**` | Requiere staff | `admin` | CRUD de usuarios |
| `/api/staff/diseno/**` | Requiere staff | `admin`, `disenador` | CRUD de propuestas y animaciones |
| `/api/public/**` | Exento | — | Endpoints públicos con RLS |
