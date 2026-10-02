import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"

const animacionUpdateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  video_movimiento_url: z.string().min(1).optional(),
  video_accion_url: z.string().nullable().optional(),
  velocidad_normal: z.number().positive().optional(),
  velocidad_inversa: z.number().positive().optional(),
  orden: z.number().int().min(0).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string; animacionId: string }> },
) {
  const { id: projectId, animacionId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const { data: animacion, error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .select("*")
    .eq("id", animacionId)
    .maybeSingle()

  if (error) {
    console.error("[GET animacion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener animación" }, { status: 500 })
  }

  if (!animacion) {
    return NextResponse.json({ error: "Animación no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ animacion })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string; animacionId: string }> },
) {
  const { id: projectId, animacionId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = animacionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.titulo !== undefined) update.titulo = parsed.data.titulo
  if (parsed.data.descripcion !== undefined) update.descripcion = parsed.data.descripcion
  if (parsed.data.video_movimiento_url !== undefined) update.video_movimiento_url = parsed.data.video_movimiento_url
  if (parsed.data.video_accion_url !== undefined) update.video_accion_url = parsed.data.video_accion_url
  if (parsed.data.velocidad_normal !== undefined) update.velocidad_normal = parsed.data.velocidad_normal
  if (parsed.data.velocidad_inversa !== undefined) update.velocidad_inversa = parsed.data.velocidad_inversa
  if (parsed.data.orden !== undefined) update.orden = parsed.data.orden

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 422 })
  }

  const { data, error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .update(update)
    .eq("id", animacionId)
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
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string; animacionId: string }> },
) {
  const { id: projectId, animacionId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Limpiar videos del storage si existen
  const { data: animacion } = await access.supabase
    .from("propuestas_3d_animaciones")
    .select("video_movimiento_url, video_accion_url")
    .eq("id", animacionId)
    .maybeSingle()

  if (animacion) {
    const { deleteVisoresVideo } = await import("@/lib/storage")
    if (animacion.video_movimiento_url) {
      await deleteVisoresVideo(access.supabase, animacion.video_movimiento_url)
    }
    if (animacion.video_accion_url) {
      await deleteVisoresVideo(access.supabase, animacion.video_accion_url)
    }
  }

  const { error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .delete()
    .eq("id", animacionId)

  if (error) {
    console.error("[DELETE animacion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar animación" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
