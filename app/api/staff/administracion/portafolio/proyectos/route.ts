import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { proyectoCreatePortafolioSchema } from "@/lib/validators"

// GET /api/staff/administracion/portafolio/proyectos → admin lista todos los proyectos
export async function GET(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ proyectos: [] })

  const { searchParams } = new URL(req.url)
  const conMedia = searchParams.get("conMedia") === "true"

  // Sin `conMedia` la consulta es la de siempre.
  if (!conMedia) {
    const { data, error } = await supabase
      .from("proyectos")
      .select("*")
      .order("orden", { ascending: true })
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ proyectos: data ?? [] })
  }

  // Con media: fotos y visores (cada visor con su propuesta resuelta).
  const { data, error } = await supabase
    .from("proyectos")
    .select(`
      *,
      fotos:proyectos_fotos(*),
      visores:proyectos_visores(
        *,
        propuesta:propuestas_3d(
          id, producto_id, titulo, descripcion, video_global_url, frame_centro_ms, estado, orden,
          producto:productos!inner(id, titulo),
          animaciones:propuestas_3d_animaciones(*)
        )
      )
    `)
    .order("orden", { ascending: true })

  if (error) {
    // Fallback: si `proyectos_visores` aún no existe en la BD, la galería sigue
    // cargando con solo las fotos (visores vacíos).
    console.warn("[GET proyectos conMedia] fallo, reintentando sin visores:", sanitizeError(error))
    const { data: dataSinVisores, error: errorSinVisores } = await supabase
      .from("proyectos")
      .select("*, fotos:proyectos_fotos(*)")
      .order("orden", { ascending: true })
    if (errorSinVisores) return NextResponse.json({ error: sanitizeError(errorSinVisores) }, { status: 500 })
    const proyectosSinVisores = (dataSinVisores ?? []).map((p) => ({ ...p, visores: [] }))
    return NextResponse.json({ proyectos: proyectosSinVisores })
  }

  return NextResponse.json({ proyectos: data ?? [] })
}

// POST /api/staff/administracion/portafolio/proyectos → admin crea proyecto en portafolio
export async function POST(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = proyectoCreatePortafolioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { titulo, descripcion, sede, categoria, orden } = parsed.data

  // Generar slug único a partir del título
  const slugBase = titulo
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || "proyecto-" + crypto.randomUUID().slice(0, 8)

  let finalSlug = slugBase
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase.from("proyectos").select("id").eq("slug", finalSlug).maybeSingle()
    if (!existing) break
    attempt++
    finalSlug = `${slugBase}-${attempt}`
  }

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      titulo,
      descripcion: descripcion ?? null,
      slug: finalSlug,
      sede,
      categoria: categoria ?? null,
      orden: orden ?? 0,
      publicado: false,
    })
    .select("*")
    .single()

  if (error) {
    console.error("[POST /api/staff/administracion/portafolio/proyectos]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear proyecto" }, { status: 500 })
  }

  return NextResponse.json({ proyecto: data }, { status: 201 })
}