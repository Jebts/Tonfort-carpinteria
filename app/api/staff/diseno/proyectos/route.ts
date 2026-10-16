import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol, getSesion } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const proyectoCreateSchema = z.object({
  cliente_id: z.string().uuid("cliente_id UUID requerido").nullable().optional(),
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  asignado_a: z.string().uuid().nullable().optional(),
})

function requireUsuarioId(sesion: { id: string; rol: string }): string {
  return sesion.id
}

export async function GET(req: NextRequest) {
  const auth = requireRol(req, ["admin", "disenador"])
  if (auth) return auth

  const sesion = getSesion(req)
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const sedeParam = searchParams.get("sede")
  const conVisor = searchParams.get("conVisor") === "true"

  let query = supabase
    .from("proyectos")
    .select("*, asignado:usuarios(*)")
    .order("orden", { ascending: true })

  if (sesion.rol === "disenador") {
    query = query.eq("asignado_a", requireUsuarioId(sesion))
    // Por defecto, el diseñador ve solo Santa Marta (proyectos con visor 3D)
    if (!sedeParam) {
      query = query.eq("sede", "santa_marta")
    } else if (sedeParam !== "todas") {
      query = query.eq("sede", sedeParam)
    }
  } else if (sedeParam && sedeParam !== "todas") {
    // Admin: filtro opcional por sede
    query = query.eq("sede", sedeParam)
  }

  // Filtro opcional: solo proyectos con visor 3D (propuestas publicadas en estado 'enviada')
  if (conVisor) {
    query = query
      .select("*, asignado:usuarios(*), propuestas_3d!inner(publicada_portafolio, estado)")
      .eq("propuestas_3d.publicada_portafolio", true)
      .eq("propuestas_3d.estado", "enviada")
  }

  const { data, error } = await query

  if (error) {
    console.error("[GET /api/staff/diseno/proyectos]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener proyectos" }, { status: 500 })
  }

  return NextResponse.json({ proyectos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = requireRol(req, ["admin", "disenador"])
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

  const parsed = proyectoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { cliente_id, titulo, descripcion, asignado_a } = parsed.data

  // Verificar que el cliente existe si se proporciona
  if (cliente_id) {
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", cliente_id)
      .maybeSingle()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }
  }

  // Generar slug único
  const slug = titulo
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()

  const slugBase = slug || "proyecto-" + crypto.randomUUID().slice(0, 8)

  // Verificar slug único (agregar sufijo si colisiona)
  let finalSlug = slugBase
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase.from("proyectos").select("id").eq("slug", finalSlug).maybeSingle()
    if (!existing) break
    attempt++
    finalSlug = `${slugBase}-${attempt}`
  }

  // Si disenador crea, asignar automáticamente al disenador
  const sesion = getSesion(req)
  const assigned = sesion?.rol === "disenador" ? requireUsuarioId(sesion) : (asignado_a ?? null)

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      cliente_id: cliente_id ?? null,
      titulo,
      descripcion: descripcion ?? null,
      slug: finalSlug,
      asignado_a: assigned,
    })
    .select("*, asignado:usuarios(*)")
    .single()

  if (error) {
    console.error("[POST /api/staff/diseno/proyectos]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear proyecto" }, { status: 500 })
  }

  return NextResponse.json({ proyecto: data }, { status: 201 })
}
