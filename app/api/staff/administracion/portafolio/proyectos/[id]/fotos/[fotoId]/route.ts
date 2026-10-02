import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { deletePortafolioImagen } from "@/lib/storage"

// DELETE /api/staff/administracion/portafolio/proyectos/[id]/fotos/[fotoId]
// Borra la foto de la galería y su objeto del bucket. Si era la portada del
// proyecto, `portada_url` se limpia en la misma operación.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { id, fotoId } = await params

  const { data: foto, error: fotoError } = await supabase
    .from("proyectos_fotos")
    .select("*")
    .eq("id", fotoId)
    .eq("proyecto_id", id)
    .maybeSingle()

  if (fotoError) {
    return NextResponse.json({ error: sanitizeError(fotoError) }, { status: 500 })
  }
  if (!foto) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from("proyectos_fotos")
    .delete()
    .eq("id", fotoId)
    .eq("proyecto_id", id)

  if (deleteError) {
    return NextResponse.json({ error: sanitizeError(deleteError) }, { status: 500 })
  }

  await deletePortafolioImagen(supabase, foto.url)

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("portada_url")
    .eq("id", id)
    .maybeSingle()

  if (proyecto?.portada_url === foto.url) {
    const { error: portadaError } = await supabase
      .from("proyectos")
      .update({ portada_url: null })
      .eq("id", id)

    if (portadaError) {
      return NextResponse.json({ error: sanitizeError(portadaError) }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
