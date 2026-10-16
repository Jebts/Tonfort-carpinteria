import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { uploadPortafolioImagen, validateImageUpload } from "@/lib/storage"

// Los visores 3D NO se suben aquí: se eligen desde las propuestas del diseñador
// (POST /proyectos/[id]/visores). Aquí solo imágenes: galería o portada.
const TIPO_MEDIA = ["galeria", "portada"] as const

// POST /api/staff/administracion/portafolio/proyectos/[id]/media
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  // Verificar proyecto
  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("id, sede")
    .eq("id", id)
    .maybeSingle()

  if (proyectoError || !proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  const formData = await req.formData()
  const files = formData.getAll("files") as File[]
  const tipo = formData.get("tipo") as string

  if (!files.length) {
    return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 })
  }

  if (!TIPO_MEDIA.includes(tipo as (typeof TIPO_MEDIA)[number])) {
    return NextResponse.json(
      { error: "Tipo de media inválido. Los visores 3D se agregan desde propuestas del diseñador." },
      { status: 400 }
    )
  }

  const resultados = []

  for (const file of files) {
    try {
      const validation = validateImageUpload(file)
      if (!validation.valid) {
        resultados.push({ nombre: file.name, success: false, error: validation.error })
        continue
      }

      const { url, error } = await uploadPortafolioImagen(supabase, file, id)
      if (error) throw new Error(error)

      if (tipo === "galeria") {
        // Obtener siguiente orden
        const { data: maxOrden } = await supabase
          .from("proyectos_fotos")
          .select("orden")
          .eq("proyecto_id", id)
          .order("orden", { ascending: false })
          .limit(1)
          .maybeSingle()

        const { data: foto, error: insertError } = await supabase
          .from("proyectos_fotos")
          .insert({
            proyecto_id: id,
            url,
            alt: file.name.replace(/\.[^/.]+$/, ""),
            orden: (maxOrden?.orden ?? -1) + 1,
          })
          .select("*")
          .single()

        if (insertError) throw insertError
        resultados.push({ nombre: file.name, success: true, foto })
      } else {
        // portada
        const { error: updateError } = await supabase
          .from("proyectos")
          .update({ portada_url: url })
          .eq("id", id)

        if (updateError) throw updateError
        resultados.push({ nombre: file.name, success: true, portada_url: url })
      }
    } catch (err) {
      console.error(`[POST media] Error subiendo ${file.name}:`, sanitizeError(err))
      resultados.push({ nombre: file.name, success: false, error: err instanceof Error ? err.message : "Error desconocido" })
    }
  }

  return NextResponse.json({ resultados })
}