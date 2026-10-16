import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import {
  ensureVisoresVideoBucket,
  validateVideoUpload,
  uploadVisoresVideo,
  deleteVisoresVideo,
  generateStoragePath,
  VIDEO_MAX_SIZE_CLIP,
} from "@/lib/storage"

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; animacionId: string }> },
) {
  const { id: visorId, animacionId } = await params
  if (!UUID.test(visorId) || !UUID.test(animacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const { denied, supabase } = await checkAccess(req, visorId)
  if (denied) return denied

  const tipo = new URL(req.url).searchParams.get("tipo")
  if (tipo !== "movimiento" && tipo !== "accion") {
    return NextResponse.json({ error: "tipo debe ser 'movimiento' o 'accion'" }, { status: 422 })
  }

  const columna = tipo === "movimiento" ? "video_movimiento_url" : "video_accion_url"

  const { data: animacion } = await supabase
    .from("visores_landing_animaciones")
    .select(columna)
    .eq("id", animacionId)
    .eq("visor_id", visorId)
    .maybeSingle()

  if (!animacion) return NextResponse.json({ error: "Animación no encontrada" }, { status: 404 })

  // Limpiar video anterior
  const existingUrl = (animacion as Record<string, string | null>)[columna]
  if (existingUrl) await deleteVisoresVideo(supabase, existingUrl)

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 })

  const validation = validateVideoUpload(file, VIDEO_MAX_SIZE_CLIP, `video_${tipo}`)
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.status })

  await ensureVisoresVideoBucket(supabase)

  const path = generateStoragePath(`animaciones/${animacionId}`, file.name)
  const { url, error } = await uploadVisoresVideo(supabase, file, path)
  if (error) {
    console.error("[UPLOAD animacion video]", error)
    return NextResponse.json({ error: "Error al subir video" }, { status: 500 })
  }

  const { data, error: updateError } = await supabase
    .from("visores_landing_animaciones")
    .update({ [columna]: url })
    .eq("id", animacionId)
    .eq("visor_id", visorId)
    .select()
    .single()

  if (updateError) {
    console.error("[UPDATE video url]", sanitizeError(updateError))
    await deleteVisoresVideo(supabase, url)
    return NextResponse.json({ error: "Error al guardar URL" }, { status: 500 })
  }

  return NextResponse.json({ url, animacion: data }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; animacionId: string }> },
) {
  const { id: visorId, animacionId } = await params
  if (!UUID.test(visorId) || !UUID.test(animacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const { denied, supabase } = await checkAccess(req, visorId)
  if (denied) return denied

  const tipo = new URL(req.url).searchParams.get("tipo")
  const url = new URL(req.url).searchParams.get("url")
  if (!tipo || !url) return NextResponse.json({ error: "Parámetros 'url' y 'tipo' requeridos" }, { status: 400 })

  const columna = tipo === "movimiento" ? "video_movimiento_url" : "video_accion_url"

  await deleteVisoresVideo(supabase, url)

  const { data, error } = await supabase
    .from("visores_landing_animaciones")
    .update({ [columna]: null })
    .eq("id", animacionId)
    .eq("visor_id", visorId)
    .select()
    .single()

  if (error) {
    console.error("[DELETE video clip]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar video" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, animacion: data })
}