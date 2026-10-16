import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function idInvalido() {
  return NextResponse.json({ error: "Visor no encontrado" }, { status: 400 })
}

/**
 * GET /api/staff/administracion/visores-landing/[id]
 * Obtiene un visor individual con sus animaciones ordenadas.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) return idInvalido()

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("visores_landing")
    .select("*, animaciones:visores_landing_animaciones(*)")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[GET visor-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }

  if (!data) return NextResponse.json({ error: "Visor no encontrado" }, { status: 404 })

  const visor = {
    ...data,
    animaciones: (data.animaciones ?? []).sort((a: any, b: any) => a.orden - b.orden),
  }

  return NextResponse.json({ visor })
}

const visorSchema = z.object({
  eyebrow: z.string().max(120).nullable().optional(),
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  video_global_url: z.string().url("Se requiere un video válido").or(z.literal("")),
  frame_centro_ms: z.number().int().min(0).max(600_000),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

// `.strict()` es imprescindible: sin él Zod descarta las claves extra y un
// body completo (con `orden` incluido) pasaba este parse, tomando el atajo de
// reordenado y descartando en silencio todo lo demás.
const ordenSchema = z
  .object({
    orden: z.number().int().min(0),
  })
  .strict()

/**
 * PATCH /api/staff/administracion/visores-landing/[id]
 * Actualiza un visor. `orden` solo: el reordenado del carrusel manda un PATCH
 * con la única clave `orden` y no toca el resto.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) return idInvalido()

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

  const { data, error: visorError } = await supabase
    .from("visores_landing")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (visorError) {
    console.error("[PATCH visor-landing] error al leer el visor", sanitizeError(visorError))
    return NextResponse.json({ error: "Error al obtener el visor" }, { status: 500 })
  }

  if (!data) return NextResponse.json({ error: "Visor no encontrado" }, { status: 404 })

  // Reordenado: cuerpo con la única clave `orden`.
  const soloOrden = ordenSchema.safeParse(body)

  if (soloOrden.success) {
    const { data: reordenado, error } = await supabase
      .from("visores_landing")
      .update({ orden: soloOrden.data.orden, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[PATCH visor-landing] orden", sanitizeError(error))
      return NextResponse.json({ error: "Error al guardar el orden" }, { status: 500 })
    }

    return NextResponse.json({ visor: reordenado })
  }

  const parsed = visorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { eyebrow, titulo, descripcion, video_global_url, frame_centro_ms, activo, orden } =
    parsed.data

  const payload = {
    eyebrow: eyebrow ?? null,
    titulo,
    descripcion: descripcion ?? null,
    video_global_url,
    frame_centro_ms,
    activo: activo ?? true,
    ...(orden === undefined ? {} : { orden }),
    updated_at: new Date().toISOString(),
  }

  const { data: actualizado, error } = await supabase
    .from("visores_landing")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[PATCH visor-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al guardar el visor" }, { status: 500 })
  }

  return NextResponse.json({ visor: actualizado })
}

/**
 * DELETE /api/staff/administracion/visores-landing/[id]
 * Borra el visor. Las animaciones caen por `ON DELETE CASCADE` de
 * `visores_landing_animaciones.visor_id`; el video de Storage no, y borrarlo
 * exigiría leer `video_global_url` y llamar a `deleteVisoresVideo`.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const { id } = await params
  if (!UUID.test(id)) return idInvalido()

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { error } = await supabase.from("visores_landing").delete().eq("id", id)

  if (error) {
    console.error("[DELETE visor-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar el visor" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}