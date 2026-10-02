import { getServiceSupabase } from "@/lib/supabase/server"
import type {
  CategoriaMueble,
  Proyecto,
  Producto,
  Propuesta3D,
  Propuesta3DAnimacion,
  ProyectoFoto,
  SedeTaller,
  VisorLandingConAnimaciones,
} from "@/lib/supabase/types"

export interface PortfolioProject {
  proyecto: Proyecto
  cliente: { nombre: string; email: string | null } | null
}

// ==========================================
// Capa pública del portafolio
// ==========================================

// Proyección pública de un proyecto. Deliberadamente no incluye `cliente_id`
// ni `asignado_a`: son datos internos de staff.
export interface ProyectoResumen {
  id: string
  slug: string
  titulo: string
  descripcion: string | null
  sede: SedeTaller
  categoria: CategoriaMueble | null
  portada_url: string | null
  created_at: string
}

// Datos del visor 3D embebible en una página pública. Shape idéntico al que
// consume `VideoViewer` en modo lectura.
export interface VisorProyecto {
  video_global_url: string
  frame_centro_ms: number
  animaciones: Propuesta3DAnimacion[]
}

export interface ProyectoPublicoCompleto {
  proyecto: ProyectoResumen
  fotos: ProyectoFoto[]
  visor: VisorProyecto | null
}

export interface FiltrosProyectosPublicados {
  sede?: SedeTaller | null
  categoria?: CategoriaMueble | null
  limite?: number | null
}

const COLUMNAS_PROYECTO =
  "id, slug, titulo, descripcion, sede, categoria, portada_url, created_at"

type ProyectoResumenCrudo = Omit<ProyectoResumen, "sede" | "categoria"> & {
  sede: string | null
  categoria: string | null
}

function toResumen(row: ProyectoResumenCrudo): ProyectoResumen {
  return {
    ...row,
    sede: (row.sede ?? "santa_marta") as SedeTaller,
    categoria: row.categoria as CategoriaMueble | null,
  }
}

// Lista proyectos publicados. Una sola query: sin N+1 y sin exigir que el
// proyecto tenga propuestas publicadas (eso es del visor, opcional).
export async function getProyectosPublicados(
  filtros: FiltrosProyectosPublicados = {},
): Promise<ProyectoResumen[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []

  let query = supabase
    .from("proyectos")
    .select(COLUMNAS_PROYECTO)
    .eq("publicado", true)

  if (filtros.sede) {
    query = query.eq("sede", filtros.sede)
  }
  if (filtros.categoria) {
    query = query.eq("categoria", filtros.categoria)
  }

  query = query.order("orden", { ascending: true }).order("created_at", { ascending: false })

  if (filtros.limite) {
    query = query.limit(filtros.limite)
  }

  const { data, error } = await query
  if (error || !data) return []

  return (data as ProyectoResumenCrudo[]).map(toResumen)
}

// Proyecto publicado completo: fotos y, para la sede de Santa Marta, el visor 3D
// de la primera propuesta publicada. `visor` es `null` cuando no hay.
export async function getProyectoPublicadoPlano(slug: string): Promise<ProyectoPublicoCompleto | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null

  const { data: proyectoRaw, error } = await supabase
    .from("proyectos")
    .select(COLUMNAS_PROYECTO)
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle()

  if (error || !proyectoRaw) return null

  const proyecto = toResumen(proyectoRaw as ProyectoResumenCrudo)

  const { data: fotosRaw } = await supabase
    .from("proyectos_fotos")
    .select("*")
    .eq("proyecto_id", proyecto.id)
    .order("orden", { ascending: true })

  const fotos = (fotosRaw ?? []) as ProyectoFoto[]

  // La sede de Bogotá es histórica: no tiene visor, solo fotos.
  const visor = proyecto.sede === "santa_marta" ? await getVisorProyecto(supabase, proyecto.id) : null

  return { proyecto, fotos, visor }
}

async function getVisorProyecto(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  proyectoId: string,
): Promise<VisorProyecto | null> {
  const { data: propuestasRaw, error } = await supabase
    .from("propuestas_3d")
    .select(
      "id, video_global_url, frame_centro_ms, producto:productos!inner(proyecto_id)",
    )
    .eq("publicada_portafolio", true)
    .eq("estado", "enviada")
    .eq("producto.proyecto_id", proyectoId)
    .order("orden", { ascending: true })
    .limit(1)

  if (error || !propuestasRaw || propuestasRaw.length === 0) return null

  const row = propuestasRaw[0] as unknown as {
    id: string
    video_global_url: string | null
    frame_centro_ms: number | null
  }

  // Sin video no hay visor que renderizar.
  if (!row.video_global_url) return null

  const { data: animacionesRaw } = await supabase
    .from("propuestas_3d_animaciones")
    .select("*")
    .eq("propuesta_id", row.id)
    .order("orden", { ascending: true })

  return {
    video_global_url: row.video_global_url,
    frame_centro_ms: row.frame_centro_ms ?? 0,
    animaciones: (animacionesRaw ?? []) as Propuesta3DAnimacion[],
  }
}

// Visores activos de la landing, con sus animaciones, ordenados por `orden`.
export async function getVisoresLandingActivos(): Promise<VisorLandingConAnimaciones[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("visores_landing")
    .select("*, animaciones:visores_landing_animaciones(*)")
    .eq("activo", true)
    .order("orden", { ascending: true })

  if (error || !data) return []

  return (data as unknown as VisorLandingConAnimaciones[]).map((visor) => ({
    ...visor,
    animaciones: (visor.animaciones ?? []).sort(
      (a, b) => a.orden - b.orden,
    ) as VisorLandingConAnimaciones["animaciones"],
  }))
}

// Un visor de la landing por slot. `null` si el slot no tiene fila activa.
export async function getVisorLandingPorSlot(
  slot: "primero" | "segundo",
): Promise<VisorLandingConAnimaciones | null> {
  const visores = await getVisoresLandingActivos()
  return visores.find((v) => v.slot === slot) ?? null
}

// ==========================================
// Link privado de propuesta (se conserva)
// ==========================================

// Obtener una propuesta publicada por token (link privado)
export async function getPropuestaByToken(token: string): Promise<{
  proyecto: Proyecto
  producto: Producto
  propuesta: Propuesta3D
  animaciones: Propuesta3DAnimacion[]
} | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null

  const { data: propuesta, error } = await supabase
    .from("propuestas_3d")
    .select("*, producto:productos!inner(*, proyecto:proyectos!inner(*))")
    .eq("link_token", token)
    .eq("link_activo", true)
    .maybeSingle()

  if (error || !propuesta) return null

  const prop = propuesta as unknown as {
    id: string
    producto_id: string
    titulo: string
    descripcion: string | null
    video_global_url: string | null
    frame_centro_ms: number | null
    estado: string
    link_token: string | null
    link_activo: boolean
    publicada_portafolio: boolean
    orden: number
    created_at: string
    updated_at: string
    producto: {
      id: string
      proyecto_id: string
      titulo: string
      descripcion: string | null
      orden: number
      created_at: string
      updated_at: string
      producto: never
      proyecto: Omit<Proyecto, "sede" | "categoria" | "portada_url"> &
        Partial<Pick<Proyecto, "sede" | "categoria" | "portada_url">>
    }
  }

  const { data: animaciones, error: animError } = await supabase
    .from("propuestas_3d_animaciones")
    .select("*")
    .eq("propuesta_id", prop.id)
    .order("orden", { ascending: true })

  if (animError) {
    console.error("[getPropuestaByToken animaciones]", animError)
  }

  return {
    proyecto: prop.producto.proyecto as Proyecto,
    producto: {
      id: prop.producto.id,
      proyecto_id: prop.producto.proyecto_id,
      titulo: prop.producto.titulo,
      descripcion: prop.producto.descripcion,
      orden: prop.producto.orden,
      created_at: prop.producto.created_at,
      updated_at: prop.producto.updated_at,
    },
    propuesta: {
      id: prop.id,
      producto_id: prop.producto_id,
      titulo: prop.titulo,
      descripcion: prop.descripcion,
      video_global_url: prop.video_global_url,
      frame_centro_ms: prop.frame_centro_ms,
      estado: prop.estado as Propuesta3D["estado"],
      link_token: prop.link_token,
      link_activo: prop.link_activo,
      publicada_portafolio: prop.publicada_portafolio,
      orden: prop.orden,
      precio_cotizacion: null,
      seleccionada_por_cliente: false,
      cotizacion_id: null,
      created_at: prop.created_at,
      updated_at: prop.updated_at,
    },
    animaciones: (animaciones || []) as Propuesta3DAnimacion[],
  }
}

// Obtener proyecto publicado por slug, con su cliente. Lectura completa
// (incluye campos internos): solo para superficies que no exponen el payload.
export async function getPortfolioProyecto(slug: string): Promise<PortfolioProject | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle()

  if (error || !data) return null

  const proyecto = data as Proyecto
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre, email")
    .eq("id", proyecto.cliente_id)
    .maybeSingle()

  return {
    proyecto,
    cliente: (cliente as { nombre: string; email: string | null } | null) ?? null,
  }
}