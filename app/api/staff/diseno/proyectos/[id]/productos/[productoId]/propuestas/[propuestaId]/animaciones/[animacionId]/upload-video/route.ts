import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import {
  ensureVisoresVideoBucket,
  validateVideoUpload,
  uploadVisoresVideo,
  deleteVisoresVideo,
  generateVideoPath,
  VIDEO_MAX_SIZE_CLIP,
} from "@/lib/storage"

// POST /api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/animaciones/[animacionId]/upload-video
// Query: ?tipo=movimiento o ?tipo=accion
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string; animacionId: string }> },
) {
  const { id: projectId, animacionId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const tipo = new URL(req.url).searchParams.get("tipo")
  if (tipo !== "movimiento" && tipo !== "accion") {
    return NextResponse.json({ error: "tipo debe ser 'movimiento' o 'accion'" }, { status: 422 })
  }

  // Verificar que la animación existe y pertenece a la propuesta correcta
  const columna = tipo === "movimiento" ? "video_movimiento_url" : "video_accion_url"

  const { data: animacion, error: animError } = await access.supabase
    .from("propuestas_3d_animaciones")
    .select(columna)
    .eq("id", animacionId)
    .maybeSingle()

  if (animError || !animacion) {
    return NextResponse.json({ error: "Animación no encontrada" }, { status: 404 })
  }

  // Limpiar video anterior si existe
  const existingUrl = (animacion as Record<string, string | null>)[columna]
  if (existingUrl) {
    await deleteVisoresVideo(access.supabase, existingUrl)
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 })
  }

  const validation = validateVideoUpload(file, VIDEO_MAX_SIZE_CLIP, `video_${tipo}`)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  // Acción es opcional - no validación adicional requerida
  await ensureVisoresVideoBucket(access.supabase)

  const folder = `animaciones/${animacionId}`
  const path = generateVideoPath(folder, file.name)

  const { url, error } = await uploadVisoresVideo(access.supabase, file, path)
  if (error) {
    console.error("[UPLOAD video clip]", error)
    return NextResponse.json({ error: "Error al subir video" }, { status: 500 })
  }

  const { data, error: updateError } = await access.supabase
    .from("propuestas_3d_animaciones")
    .update({ [columna]: url })
    .eq("id", animacionId)
    .select()
    .single()

  if (updateError) {
    console.error("[UPDATE video url]", sanitizeError(updateError))
    await deleteVisoresVideo(access.supabase, url)
    return NextResponse.json({ error: "Error al guardar URL de video" }, { status: 500 })
  }

  return NextResponse.json({ url, animacion: data }, { status: 201 })
}

// DELETE con ?url=<url>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string; animacionId: string }> },
) {
  const { id: projectId, animacionId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const tipo = new URL(req.url).searchParams.get("tipo")
  const url = new URL(req.url).searchParams.get("url")
  if (!tipo || !url) {
    return NextResponse.json({ error: "Parámetros 'url' y 'tipo' requeridos" }, { status: 400 })
  }

  const columna = tipo === "movimiento" ? "video_movimiento_url" : "video_accion_url"

  await deleteVisoresVideo(access.supabase, url)

  const { data, error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .update({ [columna]: null })
    .eq("id", animacionId)
    .select()
    .single()

  if (error) {
    console.error("[DELETE video clip]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar video" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, animacion: data })
}
