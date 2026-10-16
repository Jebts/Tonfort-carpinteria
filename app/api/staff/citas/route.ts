import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { calcularDisponibilidad, validarSlotLibre, getCitasTableName, getModalidadesActivas } from "@/lib/citas-service"
import { citaStaffSchema } from "@/lib/validators"
import { addDays } from "date-fns"
import { DURACION_MINUTOS } from "@/lib/agenda"
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

  const tableName = await getCitasTableName(supabase)

  let citasQuery = supabase
    .from(tableName)
    .select("*")
    .gte("fecha_hora", desde.toISOString())
    .lte("fecha_hora", hasta.toISOString())
    .order("fecha_hora", { ascending: true })

  if (cliente) {
    citasQuery = citasQuery.ilike("nombre_solicitante", `%${cliente}%`)
  }

  const { data, error } = await citasQuery

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  // Catálogo de modalidades: nombre y precio para la grilla sin otra llamada.
  const modalidades = await getModalidadesActivas()
  return NextResponse.json({
    slots,
    citas: (data ?? []) as Cita[],
    modalidades,
  })
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

  // Toda `aceptada` pasa por la confirmación del bloque: crearla directamente
  // permitiría saltarse la resolución de las demás `en_espera`.
  if (d.estado === "aceptada") {
    return NextResponse.json(
      { error: "Crea la cita en espera y confírmala desde el bloque" },
      { status: 422 },
    )
  }

  // El cupo es por modalidad (90 min virtual vs 120 presencial), no global.
  const validacion = await validarSlotLibre(
    supabase,
    d.fecha_hora,
    d.modalidad_id ?? null,
    undefined,
    d.duracion_minutos,
  )
  if (!validacion.ok) {
    // Ruta con sesión: se puede nombrar al ocupante para que quien Opera sepa
    // a quién contactar. En `POST /api/citas` (público) solo va el genérico.
    const ocupante = validacion.conflicto?.nombre
    return NextResponse.json(
      {
        error: ocupante
          ? `Este bloque ya tiene una cita aceptada (${ocupante})`
          : validacion.error,
        conflicto: validacion.conflicto,
      },
      { status: 422 },
    )
  }

  const tableName = await getCitasTableName(supabase)

  // La modalidad con la que se validó el cupo es la que se guarda: si no, la
  // cita quedaba con `modalidad_id = null` y nunca cerraba el bloque para el
  // flujo público de esa modalidad (el `PUT` sí la persistía).
  const modalidades = await getModalidadesActivas()
  const modalidad = d.modalidad_id
    ? modalidades.find((m) => m.id === d.modalidad_id)
    : undefined

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      cliente_id: d.cliente_id ?? null,
      nombre_solicitante: d.nombre_solicitante ?? null,
      email: d.email ?? null,
      telefono: d.telefono ?? null,
      descripcion: d.descripcion ?? null,
      fecha_hora: new Date(d.fecha_hora).toISOString(),
      duracion_minutos: d.duracion_minutos ?? DURACION_MINUTOS,
      estado: d.estado ?? "en_espera",
      origen: d.origen ?? "interna",
      meet_link: d.meet_link ?? null,
      notas: d.notas ?? null,
      modalidad_id: d.modalidad_id ?? null,
      precio_copiado: modalidad?.costo ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ cita: data as Cita }, { status: 201 })
}
