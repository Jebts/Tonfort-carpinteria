import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { CATEGORIAS_MUEBLE_SCHEMA } from "@/lib/validators"
import { z } from "zod"

const proyectoPatchSchema = z.object({
  titulo: z.string().min(2).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  orden: z.number().int().optional(),
  publicado: z.boolean().optional(),
  sede: z.enum(["santa_marta", "bogota"]).optional(),
  categoria: z.enum(CATEGORIAS_MUEBLE_SCHEMA).nullable().optional(),
  portada_url: z.string().url().nullable().optional(),
})

// PATCH /api/staff/administracion/portafolio/proyectos/[id] → admin edita proyecto (publicación)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = proyectoPatchSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten().fieldErrors }, { status: 422 })
  }

  const { id } = await params
  const d = parse.data

  const { data, error } = await supabase
    .from("proyectos")
    .update(d)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ proyecto: data })
}

// DELETE /api/staff/administracion/portafolio/proyectos/[id] → admin elimina proyecto
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { id } = await params

  const { error } = await supabase.from("proyectos").delete().eq("id", id)

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ success: true })
}