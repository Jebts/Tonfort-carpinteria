import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const visorCreateSchema = z.object({
  propuesta_id: z.string().uuid("propuesta_id UUID requerido"),
})

// Join con la propuesta: el frontend necesita video, animaciones y producto.
const SELECT_VISOR = `
  *,
  propuesta:propuestas_3d(
    id, producto_id, titulo, descripcion, video_global_url, frame_centro_ms, estado, orden,
    producto:productos!inner(id, titulo),
    animaciones:propuestas_3d_animaciones(*)
  )
`

// GET /api/staff/administracion/portafolio/proyectos/[id]/visores
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ visores: [] })
  }

  const { id } = await params

  const { data, error } = await supabase
    .from("proyectos_visores")
    .select(SELECT_VISOR)
    .eq("proyecto_id", id)
    .order("orden", { ascending: true })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ visores: data ?? [] })
}

// POST /api/staff/administracion/portafolio/proyectos/[id]/visores
//body: { propuesta_id }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = visorCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  // El proyecto debe existir y ser de Santa Marta: Bogotá es solo galería.
  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("sede")
    .eq("id", id)
    .maybeSingle()

  if (proyectoError || !proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  if (proyecto.sede !== "santa_marta") {
    return NextResponse.json(
      { error: "Los visores 3D solo están disponibles para proyectos de Santa Marta" },
      { status: 400 }
    )
  }

  // La propuesta debe pertenecer a un producto de ESTE proyecto.
  const { data: propuesta, error: propuestaError } = await supabase
    .from("propuestas_3d")
    .select("id, estado, video_global_url, producto:productos!inner(id, titulo, proyecto_id)")
    .eq("id", parsed.data.propuesta_id)
    .maybeSingle()

  if (propuestaError) {
    console.error("[POST visores] propuesta", sanitizeError(propuestaError))
    return NextResponse.json({ error: "Error al consultar la propuesta" }, { status: 500 })
  }

  if (!propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  const producto = propuesta.producto as unknown as { proyecto_id: string } | null
  if (!producto || producto.proyecto_id !== id) {
    return NextResponse.json(
      { error: "La propuesta no pertenece a este proyecto" },
      { status: 400 }
    )
  }

  if (!propuesta.video_global_url) {
    return NextResponse.json(
      { error: "La propuesta no tiene video cargado" },
      { status: 422 }
    )
  }

  // Evitar duplicados: el índice único ya lo garantiza, pero así damos 409 claro.
  const { data: existente } = await supabase
    .from("proyectos_visores")
    .select("id")
    .eq("proyecto_id", id)
    .eq("propuesta_id", parsed.data.propuesta_id)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: "Esa propuesta ya está agregada como visor en este proyecto" },
      { status: 409 }
    )
  }

  // Orden al final de la lista.
  const { data: ultima } = await supabase
    .from("proyectos_visores")
    .select("orden")
    .eq("proyecto_id", id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from("proyectos_visores")
    .insert({
      proyecto_id: id,
      propuesta_id: parsed.data.propuesta_id,
      orden: (ultima?.orden ?? -1) + 1,
      activo: true,
    })
    .select(SELECT_VISOR)
    .single()

  if (error) {
    console.error("[POST visores]", sanitizeError(error))
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esa propuesta ya está agregada como visor en este proyecto" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Error al crear visor" }, { status: 500 })
  }

  return NextResponse.json({ visor: data }, { status: 201 })
}