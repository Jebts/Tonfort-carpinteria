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
| Portafolio | `/staff/administracion/portafolio` | `proyectos`, `proyectos_fotos` | Publicar / Despublicar; editar `sede`, `categoria`, `portada_url`; subir y borrar fotos |
| Cotizaciones | `/staff/administracion/cotizaciones` | `cotizaciones`, `cotizacion_productos`, `cotizacion_propuestas` | Crear / editar / seleccionar |
| Cotización | `/staff/administracion/cotizaciones/:cotizacionId` | `cotizaciones`, `propuestas_3d` | Detalle y precios |
| Usuarios | `/staff/administracion/usuarios` | `usuarios` | Crear / Editar / Desactivar |
| Usuario | `/staff/administracion/usuarios/:id` | `usuarios` | Edición completa |

El editor de galería (`components/tonfort/staff/proyecto-fotos.tsx`) sube la foto, la usa como
portada y la elimina contra `/api/staff/administracion/portafolio/proyectos/[id]/fotos[/[fotoId]]`.
**"Usar como portada" y "Eliminar" se aplican de inmediato**; no esperan al "Guardar" del
formulario, que solo persiste `titulo`, `descripcion`, `orden`, `publicado`, `sede` y
`categoria`.

---

## 3. STAFF — Gestión (`asesor` + `admin`)

Rutas bajo `/staff/gestion/*` (`asesor` y `admin`).

| Nodo | Ruta | Entidad | Permiso |
|---|---|---|---|
| Dashboard | `/staff/gestion` | `proyectos`, `citas` | Resumen comercial |
| Agenda | `/staff/gestion/agenda` | `citas`, `clientes` | Vista semanal/mensual |
| Citas | `/staff/gestion/citas` | `citas`, `modalidades_cita` | Aceptar / Mover / Cancelar; editar campos, incluida la `direccion` de la visita presencial |
| Clientes | `/staff/gestion/clientes` | `clientes` | CRUD de clientes |
| Proyectos | `/staff/gestion/proyectos` | `proyectos` | Consulta comercial |
| Proyecto | `/staff/gestion/proyectos/:id` | `proyectos` | Consulta de avance |

La `direccion` se muestra en la tabla de la lista **y** en el formulario de edición, con la
etiqueta "Dirección de la visita". Se muestra siempre, aunque solo tiene sentido para citas
`presencial`: al crear la cita la modalidad aún no se conoce.

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
| Visores Landing | `/staff/diseno/visores` | `visores_landing`, `visores_landing_animaciones` | Upsert del visor por `slot` (solo `admin` escribe), animaciones y upload del video global |

---

## 5. SITIO PÚBLICO

Estado verificado sobre `app/` tras el refactor del espacio público. Contrato completo en
`docs/RUTAS.md`.

| Nodo | Ruta | Entidad | R/E |
|---|---|---|---|
| Landing | `/` | `visores_landing`, `proyectos`, `usuarios` | Lectura |
| Sede | `/sede` | `lib/contact.ts` | Lectura |
| Historia | `/historia` | `content/historia.ts` | Lectura |
| Portafolio (alias) | `/portafolio` | — | 307 a `/portafolio/santa-marta` |
| Portafolio [Sede] | `/portafolio/:sede` | `proyectos` (`publicado = true`, `sede`, `categoria`) | Catálogo con filtro `?categoria=` |
| Portafolio [Proyecto] | `/portafolio/:sede/:slug` | `proyectos`, `proyectos_fotos`, `propuestas_3d` (visor) | Ficha plana, sin datos de cliente ni staff |
| Enlace Privado Cliente | `/propuestas/:token` | `propuestas_3d`, `propuestas_3d_animaciones` | Visor `VideoViewer` privado |
| Cotización Cliente | `/cotizaciones/:token` | `cotizaciones`, `cotizacion_propuestas` | Vista pública y selección |
| Agenda (entrada) | `/agenda` | — | 307 a `/agenda/modalidad` |
| Paso 1 modalidad | `/agenda/modalidad` | `modalidades_cita` | Elección de modalidad |
| Paso 2 horario | `/agenda/horario` | `citas` (slots por modalidad) | Reserva pública de cita |
| Solicitud recibida | `/agenda/solicitud-recibida` | `citas`, `modalidades_cita` | Confirmación de la cita |
| Sitemap | `/sitemap.xml` | — | 6 URLs estáticas |

### Flujo de agenda (2 pasos)

El flujo público es **lineal y de 2 pasos**, no de 4. `agenda/layout.tsx` lo monta en modo
claro, es el único sitio del proyecto que no usa el fondo negro.

```
/agenda
   │  307
   ▼
/agenda/modalidad                      ← paso 1
   │  lee modalidades activas en servidor (getModalidadesActivas)
   │  el cliente elige la modalidad (virtual | presencial)
   │  navega a /agenda/horario?modalidad=<slug>
   ▼
/agenda/horario                        ← paso 2
   │  GET slots con calcularDisponibilidad(desde, hasta, { modalidadId })
   │  el estado de cada bloque se resuelve SOLO sobre las citas de esa modalidad
   │  POST /api/citas  { modalidad, nombre, telefono, descripcion }
   │    → el servidor copia modalidades_cita.costo      → citas.precio_copiado
   │    → el servidor copia modalidades_cita.duracion_minutos → citas.duracion_minutos
   ▼
/agenda/solicitud-recibida?modalidad=<slug>&fecha=<ISO>&hora=<HH:mm>
```

Reglas del flujo:

- `/agenda/horario` sin un `?modalidad=` que resuelva contra el catálogo responde **404**, no
  un calendario vacío.
- Si el catálogo de modalidades activas no tiene exactamente 2, `app/agenda/modalidad/page.tsx`
  degrada a una vista de error en vez de romper.
- El precio **nunca** lo envía el cliente: se toma de `modalidades_cita.costo` en el servidor.
- La `direccion` no se pide en el formulario público (decisión ya implementada); se rellena
  desde el panel de staff.

### Redirects públicos

| Origen | Destino | Código | Motivo |
|---|---|---|---|
| `/agenda` | `/agenda/modalidad` | 307 | Entrada del flujo nuevo |
| `/agenda/paso-1` | `/agenda/modalidad` | 301 | Ruta legacy del flujo viejo |
| `/agenda/paso-2` | `/agenda/modalidad` | 301 | Ruta legacy del flujo viejo |
| `/agenda/paso-3` | `/agenda/modalidad` | 301 | Ruta legacy del flujo viejo |
| `/agenda/confirmacion` | `/agenda/modalidad` | 301 | Ruta legacy del flujo viejo |
| `/portafolio` | `/portafolio/santa-marta` | 307 | El portafolio se publica por sede |
| `/proyectos` | `/portafolio` | 307 | Alias histórico |

Los `paso-*` y `confirmacion` son Route Handlers (`route.ts`) con `GET` que responden 301
permanente: los enlaces antiguos y los buscadores siguen funcionando.

---

## 6. Matriz de Acceso y Middleware

`proxy.ts` aplica el matcher `["/staff/:path*", "/api/staff/:path*"]`. Los dos únicos paths
exentos son `/staff/login` y `/api/staff/login` (con sus subrutas).

| Ruta | Middleware (`proxy.ts`) | Server Check (Rol) | Notas |
|---|---|---|---|
| `/staff/login` | Exento | — | Login público para personal |
| `/staff/administracion/**` | Requiere cookie staff válida | `admin` (403 si asesor o diseñador) | Administración global |
| `/staff/gestion/**` | Requiere cookie staff válida | `admin`, `asesor` (403 si diseñador) | Gestión comercial |
| `/staff/diseno/**` | Requiere cookie staff válida | `admin`, `disenador` (403 si asesor) | Taller de diseño |
| `/api/staff/login` | Exento | — | Autenticación |
| `/api/staff/usuarios/**` | Requiere staff | `admin` | CRUD de usuarios |
| `/api/staff/diseno/**` | Requiere staff | `admin`, `disenador` (lectura); escritura de `visores-landing` solo `admin` | CRUD de propuestas, animaciones y visores |
| `/api/staff/administracion/**` | Requiere staff | `admin` | Panel de publicación y cotizaciones |
| `/api/public/**` | Exento | — | Endpoints públicos con RLS |

### Alias legacy del panel

Estas rutas no aparecen en el menú: son redirecciones de compatibilidad.

| Ruta | Destino |
|---|---|
| `/staff/agenda` | `/staff/gestion/agenda` |
| `/staff/citas` | `/staff/gestion/citas` |
| `/staff/clientes` | `/staff/gestion/clientes` |
| `/staff/cotizaciones` | Ninguna: llama a `router.back()` y renderiza "Volviendo..." (retirada temporal de la ruta del sidebar) |
