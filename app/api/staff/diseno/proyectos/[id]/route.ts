import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol, getSesion } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const proyectoPatchSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  asignado_a: z.string().uuid().nullable().optional(),
  orden: z.number().int().min(0).optional(),
  publicado: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params

  let query = supabase
    .from("proyectos")
    .select("*, asignado:usuarios(*)")
    .eq("id", id)

  if (sesion.rol === "disenador") {
    query = query.eq("asignado_a", sesion.id)
  }

  const { data: proyecto, error } = await query.maybeSingle()

  if (error) {
    console.error("[GET /api/staff/diseno/proyectos/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener proyecto" }, { status: 500 })
  }

  if (!proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ proyecto })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params

  let query = supabase.from("proyectos").select("id").eq("id", id)

  if (sesion.rol === "disenador") {
    query = query.eq("asignado_a", sesion.id)
  }

  const { data: existing, error: lookupError } = await query.maybeSingle()
  if (lookupError) {
    console.error("[PATCH /api/staff/diseno/proyectos/[id]]", sanitizeError(lookupError))
    return NextResponse.json({ error: "Error al consultar proyecto" }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = proyectoPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.titulo !== undefined) update.titulo = parsed.data.titulo
  if (parsed.data.descripcion !== undefined) update.descripcion = parsed.data.descripcion
  if (parsed.data.asignado_a !== undefined) update.asignado_a = parsed.data.asignado_a
  if (parsed.data.orden !== undefined) update.orden = parsed.data.orden
  if (parsed.data.publicado !== undefined) update.publicado = parsed.data.publicado

  const { data, error } = await supabase
    .from("proyectos")
    .update(update)
    .eq("id", id)
    .select("*, asignado:usuarios(*)")
    .single()

  if (error) {
    console.error("[PATCH /api/staff/diseno/proyectos/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar proyecto" }, { status: 500 })
  }

  return NextResponse.json({ proyecto: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  const { error } = await supabase.from("proyectos").delete().eq("id", id)

  if (error) {
    console.error("[DELETE /api/staff/diseno/proyectos/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar proyecto" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
