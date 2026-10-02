export interface HotspotData {
  id: string;
  posicion_3d: [number, number, number];
  camara_preset: {
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  };
  animacion_clip: string;
  titulo: string;
  descripcion: string;
  precio_pieza?: number;
  mostrar_precio: boolean;
  orden?: number;
  video_acercamiento_url: string | null;
  video_interaccion_url: string | null;
}

export interface Cotizacion3DData {
  modelo_3d_url: string;
  video_global_url: string | null;
  frame_referencia_global_ms: number | null;
  hotspots: HotspotData[];
  titulo_proyecto: string;
  nombre_producto: string;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
}

export interface HotspotInteractionState {
  activeHotspotId: string | null
  isAnimating: boolean
  isPanelOpen: boolean
}

// Representación en base de datos (columnas descompuestas).
export interface HotspotRow {
  id: string
  propuesta_id: string | null
  portafolio_id: string | null
  posicion_x: number | null
  posicion_y: number | null
  posicion_z: number | null
  camara_preset: Record<string, unknown> | null
  animacion_clip: string | null
  video_acercamiento_url: string | null
  video_interaccion_url: string | null
  titulo: string
  descripcion: string | null
  precio_pieza: number | null
  mostrar_precio: boolean
  orden: number
  created_at: string
  updated_at: string
}

// Propuesta de diseño expuesta al visor público (solo campos relevantes 3D/video).
export interface Propuesta3D {
  id: string
  proyecto_id: string
  titulo: string
  descripcion_comercial: string | null
  modelo_3d_url: string | null
  video_global_url: string | null
  frame_referencia_global_ms: number | null
  precio_final: number | null
  tiempo_entrega: string | null
  estado: string
}

// Proyecto con link de cotización (campos públicos del link).
export interface ProyectoLink {
  id: string
  cliente_nombre: string | null
  cliente_email: string | null
  link_token: string | null
  link_activo: boolean
}

// Resultado de la API pública: datos para renderizar el visor 3D/video.
export interface CotizacionPublica {
  proyecto: ProyectoLink
  propuesta: Propuesta3D
  hotspots: HotspotData[]
}

// Tipos para el visor de video (Fase 3+)
export interface VideoViewerData {
  video_global_url: string | null
  frame_referencia_global_ms: number | null
  titulo_proyecto: string
  nombre_producto: string
  hotspots: HotspotData[]
}

// Convierte un row de BD a la representación que consumen los componentes 3D/video.
export function mapHotspotRow(row: HotspotRow): HotspotData {
  const parsed =
    row.camara_preset && typeof row.camara_preset === "object"
      ? (row.camara_preset as {
          position?: [number, number, number]
          target?: [number, number, number]
          zoom?: number
        })
      : {}
  return {
    id: row.id,
    posicion_3d: [Number(row.posicion_x) || 0, Number(row.posicion_y) || 0, Number(row.posicion_z) || 0],
    camara_preset: {
      position: parsed.position ?? [0, 1.5, 3],
      target: parsed.target ?? [0, 1.5, 0],
      ...(parsed.zoom !== undefined ? { zoom: parsed.zoom } : {}),
    },
    animacion_clip: row.animacion_clip ?? "",
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    precio_pieza: row.precio_pieza ?? undefined,
    mostrar_precio: Boolean(row.mostrar_precio),
    orden: row.orden ?? 0,
    video_acercamiento_url: row.video_acercamiento_url ?? null,
    video_interaccion_url: row.video_interaccion_url ?? null,
  }
}
