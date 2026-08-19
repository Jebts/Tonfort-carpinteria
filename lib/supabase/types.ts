// Tipos de dominio de la carpintería (single-tenant).
// Espejo de las tablas en db/sql/esquema_carpinteria.sql.

export type FaseCliente =
  | "descubrimiento"
  | "evaluacion"
  | "implementacion"
  | "egresado"

export type EstadoCita = "en_espera" | "aceptada" | "cancelada"

export type OrigenCita = "web" | "interna"

export interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  fase: FaseCliente
  info_personal: Record<string, string>
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
  creado_en: string
  actualizado_en: string
}

export interface Proyecto {
  id: string
  titulo: string
  slug: string
  resumen: string | null
  historia: string | null
  video_url: string | null
  imagen_portada: string | null
  galeria: unknown[]
  categoria: string | null
  orden: number
  publicado: boolean
  creado_en: string
  actualizado_en: string
}

// Categorías sugeridas para el portafolio (el staff puede elegir una al editar).
// En /proyectos los chips se derivan de las categorías reales de los proyectos.
export const CATEGORIAS_PROYECTO = [
  "Cocinas",
  "Closets",
  "Muebles de TV",
  "Puertas",
  "Iluminación",
  "Espacios integrales",
] as const

// Estado de un slot en la agenda pública.
export type EstadoSlot = "vacio" | "en_espera" | "aceptada" | "cancelada"

export interface SlotAgenda {
  // ISO local del inicio del slot (sin Z, interpretado en la zona del servidor).
  fecha_hora: string
  duracion_minutos: number
  estado: EstadoSlot
  // Para en_espera/aceptada: id(s) de cita asociada(s). Público solo ve en_espera/aceptada.
  citas: { id: string; estado: EstadoCita }[]
}

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
