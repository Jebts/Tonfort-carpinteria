import { NextRequest, NextResponse } from "next/server"
import {
  calcularDisponibilidad,
  crearCitaWeb,
  getCitasTableName,
  getModalidadPorSlug,
} from "@/lib/citas-service"
import { citaPublicaSchema } from "@/lib/validators"
import { addDays, startOfWeek } from "date-fns"
import { createRateLimiter, getClientIp } from "@/lib/rate-limit"

const publicCitaLimiter = createRateLimiter({ max: 5, windowMs: 60_000 })

// GET /api/citas?desde=ISO&hasta=ISO&modalidad=<slug|id>
// Disponibilidad pública: slots vacíos calculados + estado (en_espera/aceptada).
// Con `modalidad`, el estado de cada bloque se resuelve solo sobre las citas de
// esa modalidad. Nunca expone canceladas ni datos de contacto.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const desdeParam = searchParams.get("desde")
  const hastaParam = searchParams.get("hasta")
  const modalidadParam = searchParams.get("modalidad")

  const ahora = new Date()
  const desde = desdeParam ? new Date(desdeParam) : ahora
  const hasta = hastaParam ? new Date(hastaParam) : addDays(ahora, 30)

  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 })
  }

  let modalidadId: string | null = null
  if (modalidadParam) {
    const modalidad = await getModalidadPorSlug(modalidadParam)
    modalidadId = modalidad?.id ?? modalidadParam
  }

  const slots = await calcularDisponibilidad(desde, hasta, {
    incluirCanceladas: false,
    modalidadId,
  })

  return NextResponse.json({ slots })
}

// POST /api/citas
// Crea una cita en_espera (origen web) + cliente asociado si no existe.
// Límite: 1 cita por semana por IP.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limitKey = ip ?? "anonymous"
  const limit = publicCitaLimiter(limitKey)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 0) / 1000)) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = citaPublicaSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parse.error.flatten() },
      { status: 422 },
    )
  }

  const datos = parse.data
  if (new Date(datos.fecha_hora).getTime() < Date.now()) {
    return NextResponse.json({ error: "Ese horario ya pasó" }, { status: 422 })
  }

  // La modalidad se resuelve contra el catálogo antes de tocar la BD: el
  // precio y la duración los pone la BD, nunca el cliente.
  const modalidad = await getModalidadPorSlug(datos.modalidad)
  if (!modalidad) {
    return NextResponse.json({ error: "Modalidad no disponible" }, { status: 422 })
  }

  const ipReal = getClientIp(req)

  const supabase = (await import("@/lib/supabase/server")).getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  if (ipReal) {
    const fechaCita = new Date(datos.fecha_hora)
    const semanaInicio = startOfWeek(fechaCita, { weekStartsOn: 1 })
    const semanaFin = addDays(semanaInicio, 7)

    const tableName = await getCitasTableName(supabase)

    const { data: existente, error: errorExistente } = await supabase
      .from(tableName)
      .select("id")
      .eq("ip", ipReal)
      .neq("estado", "cancelada")
      .gte("fecha_hora", semanaInicio.toISOString())
      .lt("fecha_hora", semanaFin.toISOString())
      .limit(1)

    if (errorExistente) {
      return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }

    if (existente && existente.length > 0) {
      return NextResponse.json(
        { error: "Ya tienes una cita agendada para esta semana" },
        { status: 429 },
      )
    }
  }

  const result = await crearCitaWeb({
    nombre: datos.nombre,
    telefono: datos.telefono,
    descripcion: datos.descripcion,
    fecha_hora: datos.fecha_hora,
    modalidad_id: modalidad.id,
    precio_copiado: modalidad.costo,
    duracion_minutos: modalidad.duracion_minutos,
    direccion: datos.direccion ?? null,
    ip: ipReal,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "No se pudo agendar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cita: result.cita }, { status: 201 })
}
