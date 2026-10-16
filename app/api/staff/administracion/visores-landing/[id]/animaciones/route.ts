import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const animacionCreateSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  // Vacío al crear, como en el visor: el video se sube después desde el visor.
  video_movimiento_url: z.string().url("Se requiere un video de movimiento").or(z.literal("")),
  video_accion_url: z.string().url().nullable().optional(),
  orden: z.number().int().min(0).optional(),
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function existeVisor(id: string) {
  const supabase = getServiceSupabase()
  if (!supabase) return { supabase: null, visor: null }

  const { data, error } = await supabase
    .from("visores_landing")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[animaciones visor] error al leer el visor", sanitizeError(error))
    return { supabase, error: true, visor: null }
  }

  return { supabase, visor: data as { id: string } | null }
}

// GET /api/staff/administracion/visores-landing/[id]/animaciones
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Visor no encontrado" }, { status: 400 })
  }

  const { supabase, visor, error } = await existeVisor(id)
  if (error) {
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }
  if (!supabase) return NextResponse.json({ animaciones: [] })
  if (!visor) return NextResponse.json({ animaciones: [] })

  const { data, error: animacionesError } = await supabase
    .from("visores_landing_animaciones")
    .select("*")
    .eq("visor_id", visor.id)
    .order("orden", { ascending: true })

  if (animacionesError) {
    console.error("[GET animaciones]", sanitizeError(animacionesError))
    return NextResponse.json({ error: "Error al obtener animaciones" }, { status: 500 })
  }

  return NextResponse.json({ animaciones: data ?? [] })
}

// POST /api/staff/administracion/visores-landing/[id]/animaciones
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Visor no encontrado" }, { status: 400 })
  }

  const { supabase, visor, error } = await existeVisor(id)
  if (error) {
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }
  if (!visor) {
    return NextResponse.json({ error: "Visor no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = animacionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { titulo, descripcion, video_movimiento_url, video_accion_url, orden } = parsed.data

  const { data, error: insertError } = await supabase
    .from("visores_landing_animaciones")
    .insert({
      visor_id: visor.id,
      titulo,
      descripcion: descripcion ?? null,
      video_movimiento_url,
      video_accion_url: video_accion_url ?? null,
      orden: orden ?? 0,
    })
    .select()
    .single()

  if (insertError) {
    console.error("[POST animaciones]", sanitizeError(insertError))
    return NextResponse.json({ error: "Error al crear la animación" }, { status: 500 })
  }

  return NextResponse.json({ animacion: data }, { status: 201 })
}