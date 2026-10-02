import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import {
  ensureVisoresVideoBucket,
  validateVideoUpload,
  uploadVisoresVideo,
  deleteVisoresVideo,
  generateVideoPath,
  VIDEO_MAX_SIZE_GLOBAL,
} from "@/lib/storage"

// POST /api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/upload-global-video
// Sube el video global de una propuesta. Admin y diseñador asignado.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  try {
    const { id: projectId, productoId, propuestaId } = await params
    const access = await getDisenoProjectAccess(req, projectId)
    if (!access.ok) return access.response

    // Verificar que la propuesta pertenece al producto
    const { data: propuesta, error: propError } = await access.supabase
      .from("propuestas_3d")
      .select("id, video_global_url")
      .eq("id", propuestaId)
      .eq("producto_id", productoId)
      .maybeSingle()

    if (propError || !propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }

    let file: File | null = null
    try {
      const formData = await req.formData()
      file = formData.get("file") as File | null
    } catch {
      // req.formData() puede fallar si el cuerpo no es multipart
    }

    if (!file) {
      // Si no hay archivo, es una solicitud de eliminación
      if (propuesta.video_global_url) {
        await deleteVisoresVideo(access.supabase, propuesta.video_global_url)
      }
      const { data, error: updateError } = await access.supabase
        .from("propuestas_3d")
        .update({
          video_global_url: null,
          estado: "borrador",
          link_activo: false,
          publicada_portafolio: false,
        })
        .eq("id", propuestaId)
        .select()
        .single()

      if (updateError) {
        console.error("[DELETE global video db error]", updateError)
        return NextResponse.json({ error: "Error al limpiar URL de video en BD" }, { status: 500 })
      }

      return NextResponse.json({ ok: true, propuesta: data })
    }

    // Validar tipo y tamaño
    const validation = validateVideoUpload(file, VIDEO_MAX_SIZE_GLOBAL, "video_global")
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    // Asegurar bucket
    await ensureVisoresVideoBucket(access.supabase)

    // Si existía un video previo, intentar borrarlo
    if (propuesta.video_global_url) {
      await deleteVisoresVideo(access.supabase, propuesta.video_global_url)
    }

    const folder = `propuestas/${propuestaId}`
    const path = generateVideoPath(folder, file.name)

    const { url, error: uploadErr } = await uploadVisoresVideo(access.supabase, file, path)
    if (uploadErr) {
      console.error("[UPLOAD global video storage error]", uploadErr)
      return NextResponse.json({ error: "Error al subir video a storage" }, { status: 500 })
    }

    // Actualizar URL en la propuesta
    const { data, error: updateError } = await access.supabase
      .from("propuestas_3d")
      .update({ video_global_url: url })
      .eq("id", propuestaId)
      .select()
      .single()

    if (updateError) {
      console.error("[UPDATE global video url db error]", updateError)
      await deleteVisoresVideo(access.supabase, url)
      return NextResponse.json({ error: "Error al guardar URL de video" }, { status: 500 })
    }

    return NextResponse.json({ url, propuesta: data }, { status: 200 })
  } catch (err) {
    console.error("[POST upload-global-video fatal error]", err)
    return NextResponse.json({ error: "Error interno al procesar video global" }, { status: 500 })
  }
}

// DELETE con ?url=<url> — elimina el video
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  try {
    const { id: projectId, productoId, propuestaId } = await params
    const access = await getDisenoProjectAccess(req, projectId)
    if (!access.ok) return access.response

    const url = new URL(req.url).searchParams.get("url")

    // Buscar propuesta
    const { data: propuesta } = await access.supabase
      .from("propuestas_3d")
      .select("id, video_global_url")
      .eq("id", propuestaId)
      .eq("producto_id", productoId)
      .maybeSingle()

    const targetUrl = url || propuesta?.video_global_url
    if (!targetUrl) {
      return NextResponse.json({ error: "Falta parámetro 'url'" }, { status: 400 })
    }

    const deleteResult = await deleteVisoresVideo(access.supabase, targetUrl)
    if (!deleteResult.ok) {
      return NextResponse.json({ error: deleteResult.error }, { status: 500 })
    }

    const { data, error } = await access.supabase
      .from("propuestas_3d")
      .update({
        video_global_url: null,
        estado: "borrador",
        link_activo: false,
        publicada_portafolio: false,
      })
      .eq("id", propuestaId)
      .select()
      .single()

    if (error) {
      console.error("[DELETE global video db error]", error)
      return NextResponse.json({ error: "Error al eliminar video en BD" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, propuesta: data })
  } catch (err) {
    console.error("[DELETE upload-global-video fatal error]", err)
    return NextResponse.json({ error: "Error interno al eliminar video global" }, { status: 500 })
  }
}
