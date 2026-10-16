import { NextRequest, NextResponse } from "next/server"
import {
  calcularDisponibilidad,
  crearCitaWeb,
  getCitasTableName,
  getModalidadPorSlug,
  tieneCitaRecientePorIP,
  validarSlotLibre,
} from "@/lib/citas-service"
import { citaPublicaSchema } from "@/lib/validators"
import { addDays, startOfWeek } from "date-fns"
import { createRateLimiter, getClientIp } from "@/lib/rate-limit"

const publicCitaLimiter = createRateLimiter({ max: 5, windowMs: 60_000 })

// GET /api/citas?desde=ISO&hasta=ISO&modalidad=<slug|id>
// Disponibilidad pública: slots vacíos calculados + estado (en_espera/aceptada).
// Con `modalidad`, el estado de cada bloque se resuelve solo sobre las citas de
// esa modalidad. Nunca expone canceladas ni datos de contacto: solo el contador
// `canceladas` por bloque.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const desdeParam = searchParams.get("desde")
  const hastaParam = searchParams.get("hasta")
  const modalidadParam = searchParams.get("modalidad")

  const ipReal = getClientIp(req)
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
    ip: ipReal,
  })

  return NextResponse.json({ slots })
}

// POST /api/citas
// Crea una cita en_espera (origen web) + cliente asociado si no existe.
// Cupo: 1 cita `aceptada` por bloque y modalidad (`validarSlotLibre`). Una
// `en_espera` no bloquea: el público puede seguir pidiendo el mismo bloque.
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
      // Una IP (dispositivo) solo puede crear una cita cada 24 horas. Si ya
      // tiene una no cancelada en esa ventana, se bloquea y el cliente se
      // redirige a la página de solicitud recibida.
      if (await tieneCitaRecientePorIP(supabase, ipReal)) {
        return NextResponse.json(
          {
            error:
              "Ya tienes una cita agendada para hoy. Se permite una cita por dispositivo cada 24 horas. Vuelve mañana para agendar otra.",
          },
          { status: 409 },
        )
      }

      // El cupo es por bloque (misma IP + misma modalidad + misma ventana de 2 h):
    // una cita en el bloque 08:00 no impide agendar el 14:00 del mismo dia, y
    // una virtual no bloquea una presencial. La logica correcta ya vivia en
    // `validarSlotLibre`; la validacion semanal de abajo era mas restrictiva.
    const slotValidacion = await validarSlotLibre(
      supabase,
      datos.fecha_hora,
      modalidad.id,
      undefined,
      modalidad.duracion_minutos,
    )
    if (!slotValidacion.ok) {
      return NextResponse.json(
        { error: slotValidacion.error ?? "Este bloque ya tiene una cita" },
        { status: 422 },
      )
    }

    const tableName = await getCitasTableName(supabase)

    // Deduplica por IP + modalidad + el mismo bloque: un cliente no puede tener
    // dos citas en el mismo bloque, pero sí una virtual y una presencial en
    // bloques distintos de la misma semana.
    //
    // Sin IP conocido la comprobación se omite: emparejar por `ip IS NULL`
    // agruparía a todos los visitantes sin IP (y a las citas que crea staff, que
    // tienen `ip` nulo) en una misma identidad y les negaría el bloque. El cupo
    // del bloque lo sigue aplicando `validarSlotLibre` sobre `aceptada`.
    if (ipReal) {
      // Misma aritmética UTC que el resto de la agenda: la ventana es la del
      // bloque, no "hora local + 2 h".
      const slotDesde = new Date(datos.fecha_hora)
      slotDesde.setUTCMinutes(0, 0, 0)
      const slotHasta = new Date(slotDesde.getTime() + 2 * 60 * 60 * 1000)

      const { data: existente, error: errorExistente } = await supabase
        .from(tableName)
        .select("id")
        .eq("ip", ipReal)
        .eq("modalidad_id", modalidad.id)
        .neq("estado", "cancelada")
        .gte("fecha_hora", slotDesde.toISOString())
        .lt("fecha_hora", slotHasta.toISOString())
        .limit(1)

      if (errorExistente) {
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
      }

      if (existente && existente.length > 0) {
        return NextResponse.json(
          { error: "Ya tienes una cita en este bloque" },
          { status: 409 },
        )
      }
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
