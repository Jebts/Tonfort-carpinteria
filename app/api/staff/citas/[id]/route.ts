import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { citaAccionSchema, citaStaffSchema } from "@/lib/validators"
import { validarSlotLibre } from "@/lib/citas-service"
import type { Cita } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// PATCH /api/staff/citas/[id] → acciones: aceptar | cancelar | mover | eliminar
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = citaAccionSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 422 })
  }
  const { accion, fecha_hora } = parse.data

  // Cargar cita actual
  const { data: actual, error: errActual } = await supabase
    .from("citas")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (errActual) return NextResponse.json({ error: sanitizeError(errActual) }, { status: 500 })
  if (!actual) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  if (accion === "eliminar") {
    if (actual.estado !== "cancelada" && actual.estado !== "en_espera") {
      return NextResponse.json(
        { error: "Solo se puede eliminar una cita cancelada o en espera" },
        { status: 422 },
      )
    }
    const { error } = await supabase.from("citas").delete().eq("id", id)
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (accion === "aceptar") {
    const validacion = await validarSlotLibre(supabase, actual.fecha_hora, actual.id)
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 422 })
    }

    const { data, error } = await supabase
      .from("citas")
      .update({ estado: "aceptada" })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ cita: data as Cita })
  }

  if (accion === "reenviar") {
    const { data, error } = await supabase
      .from("citas")
      .update({ estado: "en_espera" })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ cita: data as Cita })
  }

  if (accion === "cancelar") {
    const { data, error } = await supabase
      .from("citas")
      .update({ estado: "cancelada" })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ cita: data as Cita })
  }

  if (accion === "mover") {
    if (!fecha_hora) {
      return NextResponse.json({ error: "Indica la nueva fecha/hora" }, { status: 422 })
    }
    const { data, error } = await supabase
      .from("citas")
      .update({
        fecha_hora: new Date(fecha_hora).toISOString(),
        fecha_hora_anterior: actual.fecha_hora,
        movida: true,
      })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
    return NextResponse.json({ cita: data as Cita })
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 422 })
}

// PUT /api/staff/citas/[id] → edición de campos (meet_link, notas, etc.)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = citaStaffSchema.partial().safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const update: Record<string, unknown> = { ...parse.data }
  if (parse.data.fecha_hora) update.fecha_hora = new Date(parse.data.fecha_hora).toISOString()

  const { data, error } = await supabase
    .from("citas")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ cita: data as Cita })
}

// DELETE /api/staff/citas/[id] (alternativo; prefiere PATCH eliminar)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { error } = await supabase.from("citas").delete().eq("id", id)
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ ok: true })
}
