import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const SLOTS = ["primero", "segundo"] as const

const animacionCreateSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  video_movimiento_url: z.string().url("Se requiere un video de movimiento"),
  video_accion_url: z.string().url().nullable().optional(),
  orden: z.number().int().min(0).optional(),
})

function slotInvalido() {
  return NextResponse.json({ error: "Slot inválido" }, { status: 400 })
}

// GET /api/staff/diseno/visores-landing/[slot]/animaciones
// Lectura: admin | disenador.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const denied = requireRol(req, ["admin", "disenador"])
  if (denied) return denied

  const { slot } = await params
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return slotInvalido()

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ animaciones: [] })

  const { data: visor, error: visorError } = await supabase
    .from("visores_landing")
    .select("id")
    .eq("slot", slot)
    .maybeSingle()

  if (visorError) {
    console.error("[GET animaciones visor]", sanitizeError(visorError))
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }

  if (!visor) return NextResponse.json({ animaciones: [] })

  const { data, error } = await supabase
    .from("visores_landing_animaciones")
    .select("*")
    .eq("visor_id", visor.id)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET animaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener animaciones" }, { status: 500 })
  }

  return NextResponse.json({ animaciones: data ?? [] })
}

// POST /api/staff/diseno/visores-landing/[slot]/animaciones
// Escritura: solo admin.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { slot } = await params
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return slotInvalido()

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { data: visor, error: visorError } = await supabase
    .from("visores_landing")
    .select("id")
    .eq("slot", slot)
    .maybeSingle()

  if (visorError) {
    console.error("[POST animaciones visor]", sanitizeError(visorError))
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }

  if (!visor) {
    return NextResponse.json(
      { error: "Crea primero el visor de este slot" },
      { status: 409 },
    )
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

  const { data, error } = await supabase
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

  if (error) {
    console.error("[POST animaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear la animación" }, { status: 500 })
  }

  return NextResponse.json({ animacion: data }, { status: 201 })
}