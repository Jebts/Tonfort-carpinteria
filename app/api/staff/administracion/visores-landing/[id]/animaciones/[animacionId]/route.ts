import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"
import { deleteVisoresVideo } from "@/lib/storage"

const animacionUpdateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  video_movimiento_url: z.string().url().optional(),
  video_accion_url: z.string().url().nullable().optional(),
  orden: z.number().int().min(0).optional(),
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function checkAccess(req: NextRequest, visorId: string) {
  const denied = requireRol(req, ["admin"])
  if (denied) return { denied, supabase: null as any }
  const supabase = getServiceSupabase()
  if (!supabase) return { denied: NextResponse.json({ error: "Backend no configurado" }, { status: 500 }), supabase: null as any }
  const { data: visor } = await supabase.from("visores_landing").select("id").eq("id", visorId).maybeSingle()
  if (!visor) return { denied: NextResponse.json({ error: "Visor no encontrado" }, { status: 404 }), supabase }
  return { denied: null, supabase }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; animacionId: string }> },
) {
  const { id: visorId, animacionId } = await params
  if (!UUID.test(visorId) || !UUID.test(animacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const { denied, supabase } = await checkAccess(req, visorId)
  if (denied) return denied

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const parsed = animacionUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })

  const update: Record<string, unknown> = {}
  if (parsed.data.titulo !== undefined) update.titulo = parsed.data.titulo
  if (parsed.data.descripcion !== undefined) update.descripcion = parsed.data.descripcion
  if (parsed.data.video_movimiento_url !== undefined) update.video_movimiento_url = parsed.data.video_movimiento_url
  if (parsed.data.video_accion_url !== undefined) update.video_accion_url = parsed.data.video_accion_url
  if (parsed.data.orden !== undefined) update.orden = parsed.data.orden

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "No hay campos válidos" }, { status: 422 })

  const { data, error } = await supabase
    .from("visores_landing_animaciones")
    .update(update)
    .eq("id", animacionId)
    .eq("visor_id", visorId)
    .select()
    .single()

  if (error) {
    console.error("[PUT animacion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar animación" }, { status: 500 })
  }
  return NextResponse.json({ animacion: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; animacionId: string }> },
) {
  const { id: visorId, animacionId } = await params
  if (!UUID.test(visorId) || !UUID.test(animacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const { denied, supabase } = await checkAccess(req, visorId)
  if (denied) return denied

  const { data: animacion } = await supabase
    .from("visores_landing_animaciones")
    .select("video_movimiento_url, video_accion_url")
    .eq("id", animacionId)
    .eq("visor_id", visorId)
    .maybeSingle()

  if (animacion) {
    if (animacion.video_movimiento_url) await deleteVisoresVideo(supabase, animacion.video_movimiento_url)
    if (animacion.video_accion_url) await deleteVisoresVideo(supabase, animacion.video_accion_url)
  }

  const { error } = await supabase
    .from("visores_landing_animaciones")
    .delete()
    .eq("id", animacionId)
    .eq("visor_id", visorId)

  if (error) {
    console.error("[DELETE animacion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar animación" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}