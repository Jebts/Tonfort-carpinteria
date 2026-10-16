import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const SELECT_VISOR = `
  *,
  propuesta:propuestas_3d(
    id, producto_id, titulo, descripcion, video_global_url, frame_centro_ms, estado, orden,
    producto:productos!inner(id, titulo),
    animaciones:propuestas_3d_animaciones(*)
  )
`

const visorPatchSchema = z
  .object({
    orden: z.number().int().min(0).optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => data.orden !== undefined || data.activo !== undefined,
    { message: "Nada que actualizar" },
  )

// PATCH /api/staff/administracion/portafolio/proyectos/[id]/visores/[visorId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; visorId: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id, visorId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = visorPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.orden !== undefined) update.orden = parsed.data.orden
  if (parsed.data.activo !== undefined) update.activo = parsed.data.activo

  const { data, error } = await supabase
    .from("proyectos_visores")
    .update(update)
    .eq("id", visorId)
    .eq("proyecto_id", id)
    .select(SELECT_VISOR)
    .single()

  if (error) {
    console.error("[PATCH visor]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar visor" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Visor no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ visor: data })
}

// DELETE /api/staff/administracion/portafolio/proyectos/[id]/visores/[visorId]
// Quita la propuesta del portafolio del proyecto. NO borra la propuesta.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; visorId: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id, visorId } = await params

  const { error } = await supabase
    .from("proyectos_visores")
    .delete()
    .eq("id", visorId)
    .eq("proyecto_id", id)

  if (error) {
    console.error("[DELETE visor]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar visor" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}