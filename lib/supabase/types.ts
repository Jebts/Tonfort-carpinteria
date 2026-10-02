// Tipos de dominio de la carpintería (single-tenant).
// Espejo de las tablas en el proyecto Supabase propsio de la carpintería.
// Schema: video-only proposal platform (Plan 1789784452919)

export type FaseCliente =
  | "descubrimiento"
  | "evaluacion"
  | "implementacion"
  | "egresado"

export type EstadoCita = "en_espera" | "aceptada" | "cancelada"

export type OrigenCita = "web" | "interna"

export type RolStaff = "admin" | "asesor" | "disenador"

export type EstadoPropuesta3D = "borrador" | "lista" | "enviada"

export type EstadoCotizacion = "creada" | "enviada" | "aceptada" | "rechazada"

// Sede del taller. `bogota` es histórico: la sede ya no existe y solo aporta
// fotos al portafolio.
export type SedeTaller = "santa_marta" | "bogota"

// Categoría de mueble. Catálogo cerrado, un solo valor por proyecto.
export type CategoriaMueble =
  | "cocina"
  | "closet"
  | "mueble_tv"
  | "puerta"
  | "iluminacion"
  | "espacio_integral"
  | "otro"

// Slot del visor 3D dentro de la landing. Solo hay 2.
export type SlotVisorLanding = "primero" | "segundo"

export interface Usuario {
  id: string
  email: string
  password_hash: string
  nombre: string
  rol: RolStaff
  foto_perfil: string | null
  bio_publica: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  fase: FaseCliente
  info_personal: Record<string, unknown>
  descripcion_proyecto: string | null
  creado_en: string
  actualizado_en: string
}

export interface Cita {
  id: string
  cliente_id: string | null
  nombre_solicitante: string | null
  email: string | null
  telefono: string | null
  descripcion: string | null
  fecha_hora: string
  duracion_minutos: number
  estado: EstadoCita
  origen: OrigenCita
  movida: boolean
  fecha_hora_anterior: string | null
  meet_link: string | null
  notas: string | null
  ip: string | null
  modalidad_id: string | null
  precio_copiado: number
  direccion: string | null
  creado_en: string
  actualizado_en: string
}

export interface ModalidadCita {
  id: string
  nombre: string
  slug: string | null
  descripcion: string | null
  costo: number
  duracion_minutos: number
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

// ==========================================
// Nuevas tablas: video-only proposal platform
// ==========================================

export interface Proyecto {
  id: string
  cliente_id: string | null
  titulo: string
  descripcion: string | null
  slug: string
  asignado_a: string | null
  orden: number
  publicado: boolean
  sede: SedeTaller
  categoria: CategoriaMueble | null
  portada_url: string | null
  created_at: string
  updated_at: string
}

// Foto de la galería del proyecto, en la página pública plana del portafolio.
export interface ProyectoFoto {
  id: string
  proyecto_id: string
  url: string
  alt: string | null
  orden: number
  created_at: string
}

// Visor 3D de la landing. Espejo de Propuesta3D para reusar VideoViewer.
export interface VisorLanding {
  id: string
  slot: SlotVisorLanding
  eyebrow: string | null
  titulo: string
  descripcion: string | null
  video_global_url: string
  frame_centro_ms: number
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface VisorLandingAnimacion {
  id: string
  visor_id: string
  titulo: string
  descripcion: string | null
  video_movimiento_url: string
  video_accion_url: string | null
  orden: number
  created_at: string
  updated_at: string
}

export interface VisorLandingConAnimaciones extends VisorLanding {
  animaciones: VisorLandingAnimacion[]
}

/**
 * Campos que el visor 3D realmente lee. Cualquier fuente que los tenga puede
 * alimentar a `VideoViewer`: tanto `propuestas_3d_animaciones` como
 * `visores_landing_animaciones` (que es su espejo).
 */
export type AnimacionVisor = Pick<
  Propuesta3DAnimacion,
  "id" | "titulo" | "descripcion" | "video_movimiento_url" | "video_accion_url"
>

export interface Producto {
  id: string
  proyecto_id: string
  titulo: string
  descripcion: string | null
  orden: number
  created_at: string
  updated_at: string
}

export interface Propuesta3D {
  id: string
  producto_id: string
  titulo: string
  descripcion: string | null
  video_global_url: string | null
  frame_centro_ms: number | null
  estado: EstadoPropuesta3D
  link_token: string | null
  link_activo: boolean
  publicada_portafolio: boolean
  orden: number
  precio_cotizacion: number | null
  seleccionada_por_cliente: boolean
  cotizacion_id: string | null
  created_at: string
  updated_at: string
}

export interface Propuesta3DAnimacion {
  id: string
  propuesta_id: string
  titulo: string
  descripcion: string | null
  video_movimiento_url: string
  video_accion_url: string | null
  velocidad_normal: number
  velocidad_inversa: number
  seleccionada: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface Cotizacion {
  id: string
  proyecto_id: string
  cliente_id: string
  token: string
  estado: EstadoCotizacion
  notas: string | null
  created_at: string
  updated_at: string
}

export interface CotizacionProducto {
  id: string
  cotizacion_id: string
  producto_id: string | null
  titulo: string
  descripcion: string | null
  orden: number
  created_at: string
  updated_at: string
}

export interface CotizacionPropuesta {
  id: string
  cotizacion_producto_id: string
  propuesta_id: string | null
  titulo: string
  descripcion: string | null
  video_global_url: string | null
  frame_centro_ms: number | null
  precio_cotizacion: number | null
  seleccionada_por_cliente: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface CotizacionConProyecto extends Cotizacion {
  proyectos: {
    id: string
    titulo: string
    slug: string
    clientes: {
      id: string
      nombre: string
      email: string
    }
  }
}

export interface CotizacionConDetalles extends Cotizacion {
  proyectos: {
    id: string
    titulo: string
    slug: string
    clientes: {
      id: string
      nombre: string
      email: string
    }
    cotizacion_productos: Array<{
      id: string
      titulo: string
      descripcion: string | null
      orden: number
      cotizacion_propuestas: Array<CotizacionPropuesta>
    }>
  }
}

// Extensiones para joins en la UI
export interface ProyectoConCliente extends Proyecto {
  cliente: Cliente | null
  asignado: Usuario | null
}

export interface ProductoConPropuestaCount extends Producto {
  propuesta_count: number
}

export interface Propuesta3DConAnimaciones extends Propuesta3D {
  animaciones: Propuesta3DAnimacion[]
}

export interface ProyectoConProductos extends Proyecto {
  productos: ProductoConPropuestaCount[]
}

// ==========================================
// Catálogos y constantes
// ==========================================

export const ESTADOS_PROYECTO: { value: EstadoPropuesta3D; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "lista", label: "Lista" },
  { value: "enviada", label: "Enviada" },
]

export const FASES: { value: FaseCliente; label: string }[] = [
  { value: "descubrimiento", label: "Descubrimiento" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "implementacion", label: "Implementación" },
  { value: "egresado", label: "Egresado" },
]

export const ESTADOS_CITA: { value: EstadoCita; label: string }[] = [
  { value: "en_espera", label: "En espera" },
  { value: "aceptada", label: "Aceptada" },
  { value: "cancelada", label: "Cancelada" },
]

export const ESTADO_SLOT = ["vacio", "en_espera", "aceptada", "cancelada"] as const
export type EstadoSlot = (typeof ESTADO_SLOT)[number]

export const SEDES: { value: SedeTaller; label: string }[] = [
  { value: "santa_marta", label: "Santa Marta" },
  { value: "bogota", label: "Bogotá" },
]

export const CATEGORIAS_MUEBLE: { value: CategoriaMueble; label: string }[] = [
  { value: "cocina", label: "Cocina" },
  { value: "closet", label: "Closet" },
  { value: "mueble_tv", label: "Mueble TV" },
  { value: "puerta", label: "Puerta" },
  { value: "iluminacion", label: "Iluminación" },
  { value: "espacio_integral", label: "Espacio integral" },
  { value: "otro", label: "Otro" },
]

export const ETIQUETA_SEDE: Record<SedeTaller, string> = {
  santa_marta: "Santa Marta",
  bogota: "Bogotá",
}

export const ETIQUETA_CATEGORIA: Record<CategoriaMueble, string> = {
  cocina: "Cocina",
  closet: "Closet",
  mueble_tv: "Mueble TV",
  puerta: "Puerta",
  iluminacion: "Iluminación",
  espacio_integral: "Espacio integral",
  otro: "Otro",
}

// Slug de sede usado en la URL del portafolio: /portafolio/santa-marta
export const SLUG_SEDE: Record<SedeTaller, string> = {
  santa_marta: "santa-marta",
  bogota: "bogota",
}

export interface SlotAgenda {
  fecha_hora: string
  duracion_minutos: number
  estado: EstadoSlot
  citas: { id: string; estado: EstadoCita }[]
}

// Transiciones de estado permitidas
export const ESTADO_TRANSITIONS: Record<EstadoPropuesta3D, EstadoPropuesta3D[]> = {
  borrador: ["lista"],
  lista: ["enviada"],
  enviada: [],
}

export const ROL_ACCESS = {
  admin: ["proyectos", "productos", "propuestas", "animaciones", "usuarios", "portafolio", "clientes", "citas"],
  disenador: ["proyectos_asignados", "productos", "propuestas", "animaciones"],
  asesor: ["clientes", "citas", "proyectos_read", "propuestas_read"],
} as const
