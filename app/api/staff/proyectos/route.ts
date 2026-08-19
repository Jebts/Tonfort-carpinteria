import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { proyectoSchema } from "@/lib/validators"
import type { Proyecto } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/proyectos → todos (incluye no publicados)
export async function GET(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ proyectos: [] })

  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("orden", { ascending: true })
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ proyectos: (data ?? []) as Proyecto[] })
}

// POST /api/staff/proyectos → crea
export async function POST(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = proyectoSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const d = parse.data
  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      titulo: d.titulo,
      slug: d.slug,
      resumen: d.resumen ?? null,
      historia: d.historia ?? null,
      video_url: d.video_url ?? null,
      imagen_portada: d.imagen_portada ?? null,
      galeria: (d.galeria ?? []) as never,
      orden: d.orden ?? 0,
      publicado: d.publicado ?? false,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ proyecto: data as Proyecto }, { status: 201 })
}
