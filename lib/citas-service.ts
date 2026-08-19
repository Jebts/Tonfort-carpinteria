import { getServiceSupabase, BACKEND_NO_CONFIGURADO } from "@/lib/supabase/server"
import { generarSlots, slotKey } from "@/lib/agenda"
import type { Cita, EstadoCita, EstadoSlot, SlotAgenda } from "@/lib/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface DisponibilidadSlot {
  fecha_hora: string
  duracion_minutos: number
  estado: EstadoSlot
  // Para staff: incluye metadatos de cada cita del slot.
  citas: CitaEnSlot[]
}

// Cita resumida dentro de un slot. Los campos de contacto/detalle solo se
// completan cuando se solicita `incluirDetalle` (uso staff); en público quedan
// `undefined` y no se serializan, evitando fugas de datos.
export interface CitaEnSlot {
  id: string
  estado: EstadoCita
  movida: boolean
  nombre: string | null
  email?: string | null
  telefono?: string | null
  descripcion?: string | null
  meet_link?: string | null
  notas?: string | null
}

interface OpcionesDisponibilidad {
  incluirCanceladas?: boolean
  // Para staff: mostrar también citas fuera de los bloques configurados.
  incluirFueraDeBloque?: boolean
  // Para staff: incluir datos de contacto/detalle (email, teléfono, meet, notas).
  incluirDetalle?: boolean
  // Filtra citas por nombre del solicitante (case-insensitive).
  cliente?: string | null
}

export async function calcularDisponibilidad(
  desde: Date,
  hasta: Date,
  opts: OpcionesDisponibilidad = {},
): Promise<DisponibilidadSlot[]> {
  const supabase = getServiceSupabase()
  const duracion = 120

  const slots = generarSlots(desde, hasta)
  const mapa = new Map<string, DisponibilidadSlot>()
  for (const s of slots) {
    mapa.set(slotKey(s), {
      fecha_hora: s.toISOString(),
      duracion_minutos: duracion,
      estado: "vacio",
      citas: [],
    })
  }

  if (!supabase) {
    return Array.from(mapa.values())
  }

  const columnas: string = opts.incluirDetalle
    ? "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id, email, telefono, descripcion, meet_link, notas"
    : "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id"

  let citasQuery = supabase
    .from("citas")
    .select(columnas)
    .gte("fecha_hora", desde.toISOString())
    .lte("fecha_hora", hasta.toISOString())

  if (opts.cliente) {
    citasQuery = citasQuery.ilike("nombre_solicitante", `%${opts.cliente}%`)
  }

  const { data, error } = await citasQuery

  if (error) {
    // Degradamos a slots vacíos si la BD falla.
    return Array.from(mapa.values())
  }

  const citas = (data ?? []) as unknown as (Cita & {
    cliente_id: string | null
    email: string | null
    telefono: string | null
    descripcion: string | null
    meet_link: string | null
    notas: string | null
  })[]

  for (const cita of citas) {
    const key = slotKey(new Date(cita.fecha_hora))
    let slot = mapa.get(key)
    if (!slot) {
      if (!opts.incluirFueraDeBloque) continue
      slot = {
        fecha_hora: new Date(cita.fecha_hora).toISOString(),
        duracion_minutos: cita.duracion_minutos,
        estado: "vacio",
        citas: [],
      }
      mapa.set(key, slot)
    }
    const enSlot: CitaEnSlot = {
      id: cita.id,
      estado: cita.estado,
      movida: cita.movida,
      nombre: cita.nombre_solicitante ?? null,
    }
    if (opts.incluirDetalle) {
      enSlot.email = cita.email ?? null
      enSlot.telefono = cita.telefono ?? null
      enSlot.descripcion = cita.descripcion ?? null
      enSlot.meet_link = cita.meet_link ?? null
      enSlot.notas = cita.notas ?? null
    }
    slot.citas.push(enSlot)
  }

  // Calcular estado de cada slot.
  for (const slot of mapa.values()) {
    const hayAceptada = slot.citas.some((c) => c.estado === "aceptada")
    const hayEspera = slot.citas.some((c) => c.estado === "en_espera")
    const hayCancelada = slot.citas.some((c) => c.estado === "cancelada")

    let estado: EstadoSlot = "vacio"
    if (hayAceptada) estado = "aceptada"
    else if (hayEspera) estado = "en_espera"
    else if (hayCancelada && opts.incluirCanceladas) estado = "cancelada"

    slot.estado = estado

    // Público: nunca ver canceladas.
    if (!opts.incluirCanceladas) {
      slot.citas = slot.citas.filter((c) => c.estado !== "cancelada")
    }
  }

  return Array.from(mapa.values()).sort(
    (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
  )
}

// Crea cliente si no existe (por email) y devuelve su id.
export async function upsertClientePorEmail(
  supabase: SupabaseClient,
  input: { nombre: string; email?: string | null; telefono?: string | null; descripcion?: string | null; info_personal?: Record<string, unknown> },
): Promise<string | null> {
  const email = input.email
  if (email) {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (existente?.id) return existente.id
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: input.nombre,
      email: input.email ?? null,
      telefono: input.telefono ?? null,
      fase: "descubrimiento",
      descripcion_proyecto: input.descripcion ?? null,
      info_personal: (input.info_personal ?? {}) as Record<string, string>,
    })
    .select("id")
    .single()

  if (error) return null
  return data?.id ?? null
}

export async function crearCitaWeb(input: {
  nombre: string
  email: string
  telefono: string
  descripcion: string
  fecha_hora: string
  info_personal?: Record<string, unknown>
  ip?: string | null
}): Promise<{ ok: boolean; cita?: Cita; error?: string }> {
  const supabase = getServiceSupabase()
  if (!supabase) return { ok: false, error: BACKEND_NO_CONFIGURADO }

  const validacion = await validarSlotLibre(supabase, input.fecha_hora)
  if (!validacion.ok) {
    return { ok: false, error: validacion.error }
  }

  const cliente_id = await upsertClientePorEmail(supabase, input)

  const { data, error } = await supabase
    .from("citas")
    .insert({
      cliente_id,
      nombre_solicitante: input.nombre,
      email: input.email,
      telefono: input.telefono,
      descripcion: input.descripcion,
      fecha_hora: new Date(input.fecha_hora).toISOString(),
      duracion_minutos: 120,
      estado: "en_espera",
      origen: "web",
      ip: input.ip ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, cita: data as Cita }
}

export async function validarSlotLibre(
  supabase: SupabaseClient,
  fechaHora: string,
  excluirId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const desde = new Date(fechaHora)
  desde.setMinutes(0, 0, 0)
  const hasta = new Date(desde)
  hasta.setHours(hasta.getHours() + 2)

  const { data, error } = await supabase
    .from("citas")
    .select("id")
    .eq("estado", "aceptada")
    .gte("fecha_hora", desde.toISOString())
    .lt("fecha_hora", hasta.toISOString())

  if (error) {
    return { ok: false, error: error.message }
  }

  const ocupado = (data ?? []).some((c) => c.id !== excluirId)
  if (ocupado) {
    return { ok: false, error: "Este bloque ya tiene una cita aceptada" }
  }

  return { ok: true }
}
