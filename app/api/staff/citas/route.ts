import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { calcularDisponibilidad, validarSlotLibre } from "@/lib/citas-service"
import { citaStaffSchema } from "@/lib/validators"
import { addDays } from "date-fns"
import type { Cita } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/citas?desde=&hasta=
// Devuelve slots (incluyendo canceladas y citas fuera de bloque) + lista plana de citas.
export async function GET(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ slots: [], citas: [] })

  const { searchParams } = req.nextUrl
  const desdeParam = searchParams.get("desde")
  const hastaParam = searchParams.get("hasta")
  const cliente = searchParams.get("cliente")?.trim() ?? null
  const ahora = new Date()
  const desde = desdeParam ? new Date(desdeParam) : ahora
  const hasta = hastaParam ? new Date(hastaParam) : addDays(ahora, 30)

  const slots = await calcularDisponibilidad(desde, hasta, {
    incluirCanceladas: true,
    incluirFueraDeBloque: true,
    incluirDetalle: true,
    cliente,
  })

  let citasQuery = supabase
    .from("citas")
    .select("*")
    .gte("fecha_hora", desde.toISOString())
    .lte("fecha_hora", hasta.toISOString())
    .order("fecha_hora", { ascending: true })

  if (cliente) {
    citasQuery = citasQuery.ilike("nombre_solicitante", `%${cliente}%`)
  }

  const { data, error } = await citasQuery

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ slots, citas: (data ?? []) as Cita[] })
}

// POST /api/staff/citas → crea cita (origen interna por defecto)
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

  const parse = citaStaffSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const d = parse.data

  const validacion = await validarSlotLibre(supabase, d.fecha_hora)
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("citas")
    .insert({
      cliente_id: d.cliente_id ?? null,
      nombre_solicitante: d.nombre_solicitante ?? null,
      email: d.email ?? null,
      telefono: d.telefono ?? null,
      descripcion: d.descripcion ?? null,
      fecha_hora: new Date(d.fecha_hora).toISOString(),
      duracion_minutos: d.duracion_minutos ?? 120,
      estado: d.estado ?? "en_espera",
      origen: d.origen ?? "interna",
      meet_link: d.meet_link ?? null,
      notas: d.notas ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ cita: data as Cita }, { status: 201 })
}
