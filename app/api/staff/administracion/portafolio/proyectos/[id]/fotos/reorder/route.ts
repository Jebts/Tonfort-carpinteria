import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { aplicarReorden } from "@/lib/reorden"
import { z } from "zod"

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

// PATCH /api/staff/administracion/portafolio/proyectos/[id]/fotos/reorder
// `ids` es la galería completa en el nuevo orden: la posición es el `orden`.
export async function PATCH(
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const ids = parsed.data.ids

  // Todas las fotos deben pertenecer al proyecto y sin repetir.
  const unicos = new Set(ids)
  if (unicos.size !== ids.length) {
    return NextResponse.json({ error: "Ids duplicados en el reordenamiento" }, { status: 422 })
  }

  const { data: existentes, error: checkError } = await supabase
    .from("proyectos_fotos")
    .select("id")
    .eq("proyecto_id", id)
    .in("id", ids)

  if (checkError) {
    console.error("[PATCH fotos/reorder] verificación", checkError.message ?? checkError)
    return NextResponse.json({ error: "Error al verificar la galería" }, { status: 500 })
  }

  if (!existentes || existentes.length !== unicos.size) {
    return NextResponse.json({ error: "Algunas fotos no pertenecen a este proyecto" }, { status: 400 })
  }

  const resultado = await aplicarReorden(supabase, "proyectos_fotos", ids, {
    columna: "proyecto_id",
    valor: id,
  })
  if (!resultado.ok) {
    return NextResponse.json({ error: "Error al reordenar la galería" }, { status: 500 })
  }

  return NextResponse.json({ success: true, actualizadas: resultado.actualizadas })
}