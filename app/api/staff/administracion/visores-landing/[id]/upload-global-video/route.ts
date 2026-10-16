import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import {
  VIDEO_MAX_SIZE_GLOBAL,
  deleteVisoresVideo,
  ensureVisoresVideoBucket,
  generateStoragePath,
  uploadVisoresVideo,
  validateVideoUpload,
} from "@/lib/storage"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/staff/administracion/visores-landing/[id]/upload-global-video
// Sube el video global del visor. Escritura: solo admin.
// Sin archivo en el FormData → elimina el video actual y limpia la URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Visor no encontrado" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  try {
    const { data: visor, error: visorError } = await supabase
      .from("visores_landing")
      .select("id, video_global_url")
      .eq("id", id)
      .maybeSingle()

    if (visorError) {
      console.error("[upload visor] error al leer el visor", sanitizeError(visorError))
      return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
    }

    if (!visor) {
      return NextResponse.json({ error: "Visor no encontrado" }, { status: 404 })
    }

    let file: File | null = null
    try {
      const formData = await req.formData()
      file = formData.get("file") as File | null
    } catch {
      // req.formData() falla si el cuerpo no es multipart: lo tratamos como borrado.
    }

    if (!file) {
      if (visor.video_global_url) {
        await deleteVisoresVideo(supabase, visor.video_global_url)
      }
      const { error: limpiezaError } = await supabase
        .from("visores_landing")
        .update({ video_global_url: "", updated_at: new Date().toISOString() })
        .eq("id", id)

      if (limpiezaError) {
        console.error("[upload visor] error al limpiar la URL", sanitizeError(limpiezaError))
        return NextResponse.json({ error: "Error al eliminar el video" }, { status: 500 })
      }

      return NextResponse.json({ url: "", eliminado: true })
    }

    const validation = validateVideoUpload(file, VIDEO_MAX_SIZE_GLOBAL, "video_global")
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    await ensureVisoresVideoBucket(supabase)

    if (visor.video_global_url) {
      await deleteVisoresVideo(supabase, visor.video_global_url)
    }

    const path = generateStoragePath(`landing/${id}/global`, file.name)
    const { url, error: uploadErr } = await uploadVisoresVideo(supabase, file, path)
    if (uploadErr) {
      console.error("[upload visor] error de storage", sanitizeError(uploadErr))
      return NextResponse.json({ error: "Error al subir video a storage" }, { status: 500 })
    }

    // La URL se guarda en la misma petición: sin este update el video solo
    // vive en el estado del cliente y se pierde al recargar la página.
    const { error: guardadoError } = await supabase
      .from("visores_landing")
      .update({ video_global_url: url, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (guardadoError) {
      console.error("[upload visor] error al guardar la URL", sanitizeError(guardadoError))
      await deleteVisoresVideo(supabase, url)
      return NextResponse.json({ error: "Error al guardar la URL del video" }, { status: 500 })
    }

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error("[upload visor] error fatal", err)
    return NextResponse.json({ error: "Error interno al procesar el video" }, { status: 500 })
  }
}