import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import {
  ensurePortafolioImagenesBucket,
  deletePortafolioImagen,
  uploadPortafolioImagen,
  validateImageUpload,
} from "@/lib/storage"

const ALT_MAX = 200

function leerAlt(formData: FormData): string | null {
  const bruto = formData.get("alt")
  if (typeof bruto !== "string") return null
  const limpio = bruto.trim().slice(0, ALT_MAX)
  return limpio.length > 0 ? limpio : null
}

// GET /api/staff/administracion/portafolio/proyectos/[id]/fotos → lista la galería
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ fotos: [] })

  const { id } = await params

  const { data, error } = await supabase
    .from("proyectos_fotos")
    .select("*")
    .eq("proyecto_id", id)
    .order("orden", { ascending: true })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ fotos: data ?? [] })
}

// POST /api/staff/administracion/portafolio/proyectos/[id]/fotos → admin sube una foto
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { id } = await params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const entrada = formData.get("file")
  const archivo: File | null = entrada instanceof Blob ? entrada : null
  if (!archivo) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 422 })
  }

  const validation = validateImageUpload(archivo)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (proyectoError) {
    return NextResponse.json({ error: sanitizeError(proyectoError) }, { status: 500 })
  }
  if (!proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  await ensurePortafolioImagenesBucket(supabase)

  // La galería pública ordena por `orden`: la nueva foto va siempre al final.
  const { data: ultima, error: ordenError } = await supabase
    .from("proyectos_fotos")
    .select("orden")
    .eq("proyecto_id", id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ordenError) {
    return NextResponse.json({ error: sanitizeError(ordenError) }, { status: 500 })
  }

  const { url, error: uploadError } = await uploadPortafolioImagen(supabase, archivo, id)
  if (uploadError || !url) {
    console.error("[portafolio fotos UPLOAD] error de storage:", uploadError)
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
  }

  const { data: foto, error: insertError } = await supabase
    .from("proyectos_fotos")
    .insert({
      proyecto_id: id,
      url,
      alt: leerAlt(formData),
      orden: (ultima?.orden ?? 0) + 1,
    })
    .select("*")
    .single()

  if (insertError || !foto) {
    console.error("[portafolio fotos INSERT] error de BD:", insertError)
    await deletePortafolioImagen(supabase, url)
    return NextResponse.json({ error: sanitizeError(insertError) }, { status: 500 })
  }

  return NextResponse.json({ foto }, { status: 201 })
}
