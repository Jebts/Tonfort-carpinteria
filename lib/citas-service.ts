import { getServiceSupabase, BACKEND_NO_CONFIGURADO } from "@/lib/supabase/server"
import { generarSlots, slotKey } from "@/lib/agenda"
import type { Cita, EstadoCita, EstadoSlot, ModalidadCita, SlotAgenda } from "@/lib/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

let cachedTableName: string | null = null

export async function getCitasTableName(supabase: SupabaseClient): Promise<string> {
  if (cachedTableName) return cachedTableName
  const { error } = await supabase.from("citas").select("id").limit(1)
  cachedTableName = error ? "cites" : "citas"
  return cachedTableName
}

export async function resetCachedTableName(): Promise<void> {
  cachedTableName = null
}

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
  modalidad_id: string | null
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
  // Disponibilidad por modalidad. Un bloque con una cita virtual aceptada sigue
  // libre para quien pide presencial, y viceversa.
  modalidadId?: string | null
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
    ? "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id, modalidad_id, email, telefono, descripcion, meet_link, notas"
    : "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id, modalidad_id"

  const tableName = await getCitasTableName(supabase)

  let citasQuery = supabase
    .from(tableName)
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
    const esDeMiModalidad = !opts.modalidadId || cita.modalidad_id === opts.modalidadId
    const enSlot: CitaEnSlot = {
      id: cita.id,
      estado: cita.estado,
      movida: cita.movida,
      // Citas de otra modalidad se listan, pero sin identificar al solicitante.
      nombre: esDeMiModalidad ? (cita.nombre_solicitante ?? null) : null,
      modalidad_id: cita.modalidad_id ?? null,
    }
    if (opts.incluirDetalle && esDeMiModalidad) {
      enSlot.email = cita.email ?? null
      enSlot.telefono = cita.telefono ?? null
      enSlot.descripcion = cita.descripcion ?? null
      enSlot.meet_link = cita.meet_link ?? null
      enSlot.notas = cita.notas ?? null
    }
    slot.citas.push(enSlot)
  }

  // Calcular estado de cada slot. Con `modalidadId`, el estado se resuelve solo
  // sobre las citas de esa modalidad: el cupo es por modalidad, no global.
  for (const slot of mapa.values()) {
    const propias = opts.modalidadId
      ? slot.citas.filter((c) => c.modalidad_id === opts.modalidadId)
      : slot.citas

    const hayAceptada = propias.some((c) => c.estado === "aceptada")
    const hayEspera = propias.some((c) => c.estado === "en_espera")
    const hayCancelada = propias.some((c) => c.estado === "cancelada")

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

// Normaliza un teléfono a dígitos para poder deduplicar clientes.
// Se comparan los últimos 10 dígitos: así "+57 3001234567" y "300 123 4567"
// colapsan en el mismo cliente.
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "")
  return digitos.length > 10 ? digitos.slice(-10) : digitos
}

interface UpsertClienteInput {
  nombre: string
  telefono?: string | null
  email?: string | null
  descripcion?: string | null
  info_personal?: Record<string, unknown>
}

// Crea el cliente si no existe (por teléfono) y devuelve su id.
// Si ya existe, completa `nombre` y `descripcion_proyecto` solo si estaban vacíos:
// nunca sobreescribe datos que el cliente ya haya dado.
export async function upsertClientePorTelefono(
  supabase: SupabaseClient,
  input: UpsertClienteInput,
): Promise<string | null> {
  const telefono = input.telefono ? normalizarTelefono(input.telefono) : ""

  if (telefono) {
    const { data: existentes } = await supabase
      .from("clientes")
      .select("id, nombre, descripcion_proyecto")
      .eq("telefono", telefono)
      .limit(1)

    const existente = existentes?.[0]
    if (existente?.id) {
      const parche: Record<string, unknown> = {}
      if (!existente.nombre) parche.nombre = input.nombre
      if (!existente.descripcion_proyecto && input.descripcion) {
        parche.descripcion_proyecto = input.descripcion
      }
      if (Object.keys(parche).length > 0) {
        await supabase.from("clientes").update(parche).eq("id", existente.id)
      }
      return existente.id
    }
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: input.nombre,
      email: input.email ?? null,
      telefono: telefono || (input.telefono ?? null),
      fase: "descubrimiento",
      descripcion_proyecto: input.descripcion ?? null,
      info_personal: (input.info_personal ?? {}) as Record<string, string>,
    })
    .select("id")
    .single()

  if (error) return null
  return data?.id ?? null
}

/** @deprecated La deduplicación es por teléfono. Usar `upsertClientePorTelefono`. */
export async function upsertClientePorEmail(
  supabase: SupabaseClient,
  input: UpsertClienteInput,
): Promise<string | null> {
  return upsertClientePorTelefono(supabase, input)
}

// Catálogo de modalidades activas, ordenado. La fuente de verdad de precio y
// duración es la tabla: el cliente nunca los envía.
export async function getModalidadesActivas(): Promise<ModalidadCita[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("modalidades_cita")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true })

  if (error || !data) return []
  return data as ModalidadCita[]
}

// Resuelve una modalidad por su slug público (`virtual` | `presencial`).
export async function getModalidadPorSlug(slug: string): Promise<ModalidadCita | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("modalidades_cita")
    .select("*")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle()

  if (error || !data) return null
  return data as ModalidadCita
}

export interface CrearCitaWebInput {
  nombre: string
  telefono: string
  descripcion?: string | null
  fecha_hora: string
  modalidad_id: string
  precio_copiado: number
  duracion_minutos?: number
  direccion?: string | null
  info_personal?: Record<string, unknown>
  ip?: string | null
}

export async function crearCitaWeb(input: CrearCitaWebInput): Promise<{ ok: boolean; cita?: Cita; error?: string }> {
  const supabase = getServiceSupabase()
  if (!supabase) return { ok: false, error: BACKEND_NO_CONFIGURADO }

  const validacion = await validarSlotLibre(supabase, input.fecha_hora, input.modalidad_id)
  if (!validacion.ok) {
    return { ok: false, error: validacion.error }
  }

  const cliente_id = await upsertClientePorTelefono(supabase, input)

  const tableName = await getCitasTableName(supabase)

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      cliente_id,
      nombre_solicitante: input.nombre,
      telefono: input.telefono,
      descripcion: input.descripcion ?? null,
      fecha_hora: new Date(input.fecha_hora).toISOString(),
      duracion_minutos: input.duracion_minutos ?? 120,
      estado: "en_espera",
      origen: "web",
      modalidad_id: input.modalidad_id,
      precio_copiado: input.precio_copiado,
      direccion: input.direccion ?? null,
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
  modalidadId?: string | null,
  excluirId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const desde = new Date(fechaHora)
  desde.setMinutes(0, 0, 0)
  const hasta = new Date(desde)
  hasta.setHours(hasta.getHours() + 2)

  const tableName = await getCitasTableName(supabase)

  let query = supabase
    .from(tableName)
    .select("id")
    .eq("estado", "aceptada")
    .gte("fecha_hora", desde.toISOString())
    .lt("fecha_hora", hasta.toISOString())

  // El cupo es por modalidad: una cita virtual no bloquea el bloque presencial.
  if (modalidadId) {
    query = query.eq("modalidad_id", modalidadId)
  }

  const { data, error } = await query

  if (error) {
    return { ok: false, error: error.message }
  }

  const ocupado = (data ?? []).some((c) => c.id !== excluirId)
  if (ocupado) {
    return { ok: false, error: "Este bloque ya tiene una cita aceptada" }
  }

  return { ok: true }
}
