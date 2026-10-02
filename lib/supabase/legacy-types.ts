// Tipos legacy (portafolio_proyectos) — conservados para compatibilidad con componentes existentes.
// NO usar en nuevo código. El flujo activo usa Proyecto, Producto, Propuesta3D, Propuesta3DAnimacion.

export interface PortafolioProyecto {
  id: string
  cliente_id: string
  titulo: string
  descripcion: string | null
  slug: string
  resumen: string | null
  historia: string | null
  video_url: string | null
  video_global_url: string | null
  frame_referencia_global_ms: number | null
  modelo_3d_url: string | null
  imagen_portada: string | null
  galeria: string[]
  categoria: string | null
  proyecto_id: string | null
  orden: number
  publicado: boolean
  created_at: string
  updated_at: string
}

export const CATEGORIAS_PROYECTO = [
  "Cocinas",
  "Closets",
  "Muebles de TV",
  "Puertas",
  "Iluminación",
  "Espacios integrales",
] as const

// Tipos legacy de cotizaciones/productos (producto_versiones, etc.)
export interface ProductoVersion {
  id: string
  proyecto_id: string
  modelo_id: string
  nombre: string
  seleccion: Record<string, unknown>
  snapshot_json: Record<string, unknown> | null
  precio_final: number | null
  tiempo_entrega: string | null
  estado: string
  created_at: string
  updated_at: string
}

export interface ProductoVersionModelo {
  id: string
  producto_version_id: string
  modelo_id: string
  orden: number
}

export interface ProductoVersionMaterial {
  id: string
  producto_version_id: string
  tipo_material: string
  nombre_material: string
  cantidad: number
  unidad: string
  precio_unitario: number
  created_at: string
}