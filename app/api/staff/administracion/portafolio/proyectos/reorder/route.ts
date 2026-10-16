import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { aplicarReorden } from "@/lib/reorden"
import { z } from "zod"

const reorderSchema = z.object({
  cambios: z.array(z.object({
    id: z.string().uuid(),
    orden: z.number().int().min(0),
  })).min(1),
})

// PATCH /api/staff/administracion/portafolio/proyectos/reorder → admin reordena proyectos
export async function PATCH(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

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

  const { cambios } = parsed.data
  const idsEnOrden = cambios
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((c) => c.id)

  // Todos los ids deben existir: la posición recibida es el nuevo orden, así
  // que no se aceptan ids inventados ni repetidos.
  const unicos = new Set(idsEnOrden)
  if (unicos.size !== idsEnOrden.length) {
    return NextResponse.json({ error: "Ids duplicados en el reordenamiento" }, { status: 422 })
  }

  const { data: existentes, error: checkError } = await supabase
    .from("proyectos")
    .select("id")
    .in("id", idsEnOrden)

  if (checkError) {
    console.error("[PATCH /reorder] verificación", checkError.message ?? checkError)
    return NextResponse.json({ error: "Error al verificar los proyectos" }, { status: 500 })
  }

  if (!existentes || existentes.length !== unicos.size) {
    return NextResponse.json({ error: "Algunos proyectos no existen" }, { status: 400 })
  }

  const resultado = await aplicarReorden(supabase, "proyectos", idsEnOrden)
  if (!resultado.ok) {
    return NextResponse.json({ error: "Error al reordenar proyectos" }, { status: 500 })
  }

  return NextResponse.json({ success: true, actualizados: resultado.actualizadas })
}