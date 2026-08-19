import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { ensureProyectosBucket } from "@/lib/storage"

// POST /api/staff/proyectos/upload-imagen → sube la imagen de portada al bucket
// 'proyectos' (service_role, omite RLS) y devuelve su URL pública. El cliente la
// guarda luego en `imagen_portada` del proyecto.

const BUCKET = "proyectos"
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function slugify(text: string): string {
  const raw = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  if (!raw) return "portada"
  return raw
}

export async function POST(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: "Backend no configurado: faltan CARPINTERIA_SUPABASE_* en el .env del staff" },
      { status: 500 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Body multipart inválido" }, { status: 400 })
  }

  const file = form.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen (image/*)" }, { status: 422 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera el límite de 10 MB" }, { status: 422 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const base = slugify(form.get("slug")?.toString() || form.get("titulo")?.toString() || "portada")
  const path = `${base}-${Date.now()}.${ext}`

  try {
    await ensureProyectosBucket(supabase)
  } catch (bucketError) {
    console.error("[upload-imagen] error asegurando bucket:", bucketError)
    return NextResponse.json(
      { error: "No se pudo preparar el almacenamiento (bucket 'proyectos')" },
      { status: 500 },
    )
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch (arrayError) {
    console.error("[upload-imagen] error leyendo archivo:", arrayError)
    return NextResponse.json({ error: "No se pudo leer el archivo de imagen" }, { status: 400 })
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error("[upload-imagen] error de storage:", error.message)
    return NextResponse.json(
      { error: sanitizeError(error, "No se pudo subir la imagen (¿bucket 'proyectos' creado?)") },
      { status: 500 },
    )
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
