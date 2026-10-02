import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const SLOTS = ["primero", "segundo"] as const

const visorUpsertSchema = z.object({
  slot: z.enum(SLOTS),
  eyebrow: z.string().max(120).nullable().optional(),
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  video_global_url: z.string().url("Se requiere un video válido"),
  frame_centro_ms: z.number().int().min(0).max(600_000),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

// GET /api/staff/diseno/visores-landing
// Lectura: admin | disenador.
export async function GET(req: NextRequest) {
  const denied = requireRol(req, ["admin", "disenador"])
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ visores: [] })

  const { data, error } = await supabase
    .from("visores_landing")
    .select("*, animaciones:visores_landing_animaciones(*)")
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET visores-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener visores" }, { status: 500 })
  }

  const visores = (data ?? []).map((visor) => {
    const { animaciones, ...resto } = visor as unknown as {
      animaciones?: { orden: number }[]
    }
    return { ...resto, animaciones: (animaciones ?? []).sort((a, b) => a.orden - b.orden) }
  })

  return NextResponse.json({ visores })
}

// PUT /api/staff/diseno/visores-landing
// Upsert por `slot`. Escritura: solo admin.
export async function PUT(req: NextRequest) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

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

  const parsed = visorUpsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { slot, eyebrow, titulo, descripcion, video_global_url, frame_centro_ms, activo, orden } =
    parsed.data

  const payload = {
    slot,
    eyebrow: eyebrow ?? null,
    titulo,
    descripcion: descripcion ?? null,
    video_global_url,
    frame_centro_ms,
    activo: activo ?? true,
    orden: orden ?? (slot === "primero" ? 0 : 1),
    updated_at: new Date().toISOString(),
  }

  // El índice único es por `slot`: el upsert no puede ambiguar.
  const { data, error } = await supabase
    .from("visores_landing")
    .upsert(payload, { onConflict: "slot" })
    .select()
    .single()

  if (error) {
    console.error("[PUT visores-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al guardar el visor" }, { status: 500 })
  }

  return NextResponse.json({ visor: data })
}