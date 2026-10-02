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

const SLOTS = ["primero", "segundo"] as const

type Slot = (typeof SLOTS)[number]

function slotInvalido() {
  return NextResponse.json({ error: "Slot inválido" }, { status: 400 })
}

// POST /api/staff/diseno/visores-landing/[slot]/upload-global-video
// Sube el video global del visor. Escritura: solo admin.
// Sin archivo en el FormData → elimina el video actual y limpia la URL.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { slot } = await params
  if (!SLOTS.includes(slot as Slot)) return slotInvalido()

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  try {
    const { data: visor, error: visorError } = await supabase
      .from("visores_landing")
      .select("id, video_global_url")
      .eq("slot", slot)
      .maybeSingle()

    if (visorError) {
      console.error("[upload visor] error al leer el visor", sanitizeError(visorError))
      return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
    }

    if (!visor) {
      return NextResponse.json(
        { error: "Crea primero el visor de este slot" },
        { status: 409 },
      )
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

    const path = generateStoragePath(`landing/${slot}/global`, file.name)
    const { url, error: uploadErr } = await uploadVisoresVideo(supabase, file, path)
    if (uploadErr) {
      console.error("[upload visor] error de storage", sanitizeError(uploadErr))
      return NextResponse.json({ error: "Error al subir video a storage" }, { status: 500 })
    }

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error("[upload visor] error fatal", err)
    return NextResponse.json({ error: "Error interno al procesar el video" }, { status: 500 })
  }
}
