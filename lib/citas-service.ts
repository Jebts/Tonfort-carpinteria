import { getServiceSupabase, BACKEND_NO_CONFIGURADO } from "@/lib/supabase/server"
import { generarSlots, slotKey, DURACION_MINUTOS } from "@/lib/agenda"
import type { Cita, EstadoCita, EstadoSlot, ModalidadCita, SlotAgenda } from "@/lib/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

// Margen hacia atrás para traer aceptadas que empiezan antes del slot pero lo
// solapan. Es el máximo que admite `citaStaffSchema` (600 min).
const VENTANA_MAXIMA_MINUTOS = 600

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
  /** Citas del bloque en `en_espera` (contador para la grilla). */
  enEspera: number
  /** Citas del bloque `cancelada` (solo visible en staff). */
  canceladas: number
}

// Cita resumida dentro de un slot. Los campos de contacto/detalle solo se
  // completan cuando se solicita `incluirDetalle` (uso staff); en público quedan
  // `undefined` y no se serializan, evitando fugas de datos.
  export interface CitaEnSlot {
    id: string
    estado: EstadoCita
    movida: boolean
    /** Ya no se rellena: el payload público es anónimo (ver `calcularDetalle`). */
    nombre?: string | null
    modalidad_id: string | null
    /** Verdadero cuando esa cita pertenece al mismo IP que está viendo. Permite
        * al calendario público signalar "esta cita es tuya" sin filtrar datos
        * de otros solicitantes (el IP ya es la identidad). */
    esMio: boolean
    email?: string | null
    telefono?: string | null
    descripcion?: string | null
    meet_link?: string | null
    notas?: string | null
  }

interface OpcionesDisponibilidad {
  incluirCanceladas?: boolean
  // Para staff: mostrar también fuera de los bloques configurados.
  incluirFueraDeBloque?: boolean
  // Para staff: incluir datos de contacto/detalle (email, teléfono, meet, notas).
  incluirDetalle?: boolean
  // Filtra citas por nombre del solicitante (case-insensitive).
  cliente?: string | null
  // Disponibilidad por modalidad. Un bloque con una cita virtual aceptada sigue
  // libre para quien pide presencial, y viceversa.
  modalidadId?: string | null
  // IP del visitante: marca las citas de ese mismo IP como `esMio` para que el
  // calendario público pueda pintar "tu cita" sin exposer datos ajenos.
  ip?: string | null
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
      enEspera: 0,
      canceladas: 0,
    })
  }

  if (!supabase) {
    return Array.from(mapa.values())
  }

  // `ip` viaja en las dos variantes: sin ella `esMio` (quiénes son *mis* citas)
  // nunca podría ser true, porque la fila no trae el campo.
  const columnas: string = opts.incluirDetalle
    ? "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id, modalidad_id, email, telefono, descripcion, meet_link, notas, ip"
    : "id, fecha_hora, estado, movida, nombre_solicitante, cliente_id, modalidad_id, ip"

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
        enEspera: 0,
        canceladas: 0,
      }
      mapa.set(key, slot)
    }
const esDeMiModalidad = !opts.modalidadId || cita.modalidad_id === opts.modalidadId
    const enSlot: CitaEnSlot = {
      id: cita.id,
      estado: cita.estado,
      movida: cita.movida,
      // El nombre del solicitante NUNCA viaja en el payload público: los
      // contadores por bloque ya dicen todo lo que la grilla necesita, y
      // `/api/citas` es anónimo. Los datos completos solo salen por las rutas
      // de staff, que leen la tabla directamente.
      modalidad_id: cita.modalidad_id ?? null,
      // El IP es la identidad pública: marca cuáles son *mis* citeas sin
      // filtrar nombre/email de otros visitantes.
      esMio: Boolean(opts.ip && opts.ip === (cita.ip ?? null)),
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
    // Los contadores se calculan antes de filtrar (el público necesita ver
    // cuántas hay sin recibir los datos) y sobre `propias`: en la vista de una
    // modalidad, un círculo con la cuenta de la otra contradiría el estado de
    // la celda, que sí es por modalidad.
    slot.enEspera = propias.filter((c) => c.estado === "en_espera").length
    slot.canceladas = propias.filter((c) => c.estado === "cancelada").length

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
//
// El error no se traga: `/agenda/modalidad` degrada a un mensaje de
// mantenimiento cuando recibe menos de 2 filas, y sin este log es imposible
// distinguir "catálogo vacío" de "consulta rota" (columna que falta, RLS,
// tabla caída). Es lo que hizo que un `.order("orden")` sobre una columna
// inexistente pasara desapercibido.
export async function getModalidadesActivas(): Promise<ModalidadCita[]> {
  const supabase = getServiceSupabase()
  if (!supabase) {
    console.error("[citas-service] getModalidadesActivas: Supabase no configurado")
    return []
  }

  const { data, error } = await supabase
    .from("modalidades_cita")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[citas-service] getModalidadesActivas falló:", error.message)
    return []
  }
  if (!data) return []

  if (data.length !== 2) {
    console.warn(
      `[citas-service] getModalidadesActivas devolvió ${data.length} filas activas; el flujo espera exactamente 2 (virtual, presencial).`,
    )
  }
  return data as ModalidadCita[]
}

// Resuelve una modalidad por su slug público (`virtual` | `presencial`).
export async function getModalidadPorSlug(slug: string): Promise<ModalidadCita | null> {
  const supabase = getServiceSupabase()
  if (!supabase) {
    console.error("[citas-service] getModalidadPorSlug: Supabase no configurado")
    return null
  }

  const { data, error } = await supabase
    .from("modalidades_cita")
    .select("*")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle()

  // `maybeSingle` no da error cuando no encuentra fila: es un 404 silencioso
  // que `/agenda/horario` convierte en notFound(). Solo se registra el error real.
  if (error) {
    console.error(`[citas-service] getModalidadPorSlug("${slug}") falló:`, error.message)
    return null
  }
  if (!data) {
    console.warn(`[citas-service] getModalidadPorSlug("${slug}"): no hay modalidad activa con ese slug.`)
    return null
  }
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

  // La duración real de la modalidad decide la ventana ocupada: 90 min para
  // virtual, 120 para presencial (ver `validarSlotLibre`).
  const validacion = await validarSlotLibre(
    supabase,
    input.fecha_hora,
    input.modalidad_id,
    undefined,
    input.duracion_minutos,
  )
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
  duracionMinutos?: number,
): Promise<{ ok: boolean; error?: string; conflicto?: ConflictoSlot }> {
  const inicio = new Date(fechaHora)
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, error: "Fecha no válida" }
  }

  // La ventana es la duración real del servicio (90 min virtual, 120 min
  // presencial), no 2 h fijas: con 2 h una virtual de 08:00 a 09:30 tapona
  // huecos que legalmente quedan libres. Los intervalos son semiabiertos
  // ([inicio, fin)): los bloques son contiguos por diseño, así que una cita
  // que termina a las 10:00 no estorba a la que empieza a las 10:00.
  const duracion = duracionMinutos && duracionMinutos > 0 ? duracionMinutos : DURACION_MINUTOS
  const fin = new Date(inicio.getTime() + duracion * 60_000)

  const tableName = await getCitasTableName(supabase)

  // También se traen las aceptadas que empiezan ANTES del slot: una cita a las
  // 09:45 de 90 min pisa un bloque de 10:00 aunque no empiece dentro de él.
  let query = supabase
    .from(tableName)
    .select("id, nombre_solicitante, fecha_hora, duracion_minutos")
    .eq("estado", "aceptada")
    .lt("fecha_hora", fin.toISOString())
    .gte("fecha_hora", new Date(inicio.getTime() - VENTANA_MAXIMA_MINUTOS * 60_000).toISOString())

  // El cupo es por modalidad: una cita virtual no bloquea el bloque presencial.
  if (modalidadId) {
    query = query.eq("modalidad_id", modalidadId)
  }

  const { data, error } = await query

  if (error) {
    return { ok: false, error: error.message }
  }

  const filas = (data ?? []) as {
    id: string
    nombre_solicitante: string | null
    fecha_hora: string
    duracion_minutos: number | null
  }[]

  const solapes = filas.filter((c) => {
    if (c.id === excluirId) return false
    const citaInicio = new Date(c.fecha_hora).getTime()
    if (Number.isNaN(citaInicio)) return true // fila sin fecha parseable: se asume ocupante
    const citaFin = citaInicio + (c.duracion_minutos ?? DURACION_MINUTOS) * 60_000
    return citaInicio < fin.getTime() && citaFin > inicio.getTime()
  })

  if (solapes.length > 0) {
    const c = solapes[0]
    // El mensaje es genérico a propósito: lo propaga tal cual `POST /api/citas`,
    // que es público. El nombre del ocupante solo viaja en `conflicto`, que las
    // rutas de staff (autenticadas) pueden usar para avisar a quien opera.
    return {
      ok: false,
      error: "Este bloque ya tiene una cita aceptada",
      conflicto: { id: c.id, nombre: c.nombre_solicitante },
    }
  }

  return { ok: true }
}

// --- Confirmación de una cita en espera ---

export interface ConflictoSlot {
  id: string
  nombre: string | null
}

export interface PendienteConfirmacion {
  id: string
  nombre: string | null
  fecha_hora: string
}

/** Qué se hace con cada otra `en_espera` del bloque al confirmar. */
export interface ResolucionPendiente {
  id: string
  accion: "mover" | "eliminar"
  /** Obligatorio cuando `accion === "mover"`. */
  fecha_hora?: string
}

export type ResultadoConfirmacion =
  | { ok: true; cita: Cita; resueltas: number }
  | { ok: false; status: 409 | 422 | 500; error: string; pendientes?: PendienteConfirmacion[] }

// Confirmar una `en_espera` exige resolver el resto del bloque: por cada otra
// `en_espera` de la misma `fecha_hora` + `modalidad_id` hay que indicar si se
// mueve (y a qué bloque) o se elimina. Solo entonces la elegida pasa a
// `aceptada`.
//
// "Mismo bloque" = misma `fecha_hora` de inicio (`slotKey`) Y misma modalidad:
// una presencial no se mueve porque se confirme una virtual (servicios
// distintos, 120 vs 90 min).
//
// Sin transacción real (supabase-js no hace multi-statement): las escrituras
// son secuenciales y reintentables por id, y el UPDATE de la elegida va el
// último para no dejar el bloque sin confirmada si una mudanza falla.
export async function resolverConfirmacion(
  supabase: SupabaseClient,
  cita: Cita,
  resolucion?: ResolucionPendiente[],
): Promise<ResultadoConfirmacion> {
  if (cita.estado !== "en_espera") {
    return { ok: false, status: 422, error: "Solo se pueden confirmar citas en espera" }
  }

  const tableName = await getCitasTableName(supabase)
  const modalidad = cita.modalidad_id ?? null

  // Una consulta para las dos comprobaciones: qué hay ya confirmada en el
  // bloque (paso 4) y qué queda en espera (paso 5).
  let query = supabase
    .from(tableName)
    .select("id, estado, nombre_solicitante, fecha_hora, duracion_minutos")
    .eq("fecha_hora", cita.fecha_hora)
    .neq("id", cita.id)
  if (modalidad) {
    query = query.eq("modalidad_id", modalidad)
  } else {
    query = query.is("modalidad_id", null)
  }

  const { data, error } = await query
  if (error) return { ok: false, status: 500, error: error.message }

  type Fila = {
    id: string
    estado: EstadoCita
    nombre_solicitante: string | null
    fecha_hora: string
    duracion_minutos: number | null
  }
  const delBloque = ((data ?? []) as Fila[]).filter(
    (c) => slotKey(new Date(c.fecha_hora)) === slotKey(new Date(cita.fecha_hora)),
  )

  if (delBloque.some((c) => c.estado === "aceptada")) {
    return { ok: false, status: 409, error: "El bloque ya tiene una cita confirmada" }
  }

  const pendientes = delBloque.filter((c) => c.estado === "en_espera")

  if (pendientes.length > 0 && !resolucion) {
    return {
      ok: false,
      status: 422,
      error: "Indica qué hacer con las demás citas en espera del bloque",
      pendientes: pendientes.map((p) => ({
        id: p.id,
        nombre: p.nombre_solicitante,
        fecha_hora: p.fecha_hora,
      })),
    }
  }

  if (resolucion) {
    const idsPendientes = pendientes.map((p) => p.id)
    const idsResolucion = resolucion.map((r) => r.id)
    // Biyección entre conjuntos: con solo longitud + pertenencia, una
    // resolución tipo [{id:P},{id:P}] pasaba y dejaba Q sin resolver.
    const cubre =
      new Set(idsResolucion).size === idsResolucion.length &&
      new Set(idsResolucion).size === new Set(idsPendientes).size &&
      idsResolucion.every((id) => idsPendientes.includes(id))
    if (!cubre) {
      return {
        ok: false,
        status: 422,
        error: "La resolución no cubre todas las citas en espera",
      }
    }
  }

  // ---- C6: prevalidar TODOS los destinos antes de la primera escritura ----
  // Sin esto, un 409 del segundo paso llegaba después de haber movido o borrado
  // el primero, y el bloque quedaba a medias (supabase-js no hace rollback).
  const claveOrigen = slotKey(new Date(cita.fecha_hora))
  for (const paso of resolucion ?? []) {
    if (paso.accion !== "mover") continue
    if (!paso.fecha_hora) {
      return { ok: false, status: 422, error: "Indica el bloque destino para mover la cita" }
    }
    const destino = new Date(paso.fecha_hora)
    if (Number.isNaN(destino.getTime())) {
      return { ok: false, status: 422, error: "Bloque destino no válido" }
    }
    // C5: mover una pendiente al bloque que se está confirmando dejaría el bloque
    // con una `aceptada` y una `en_espera` movida encima.
    if (slotKey(destino) === claveOrigen) {
      return {
        ok: false,
        status: 422,
        error: "Elige un bloque distinto al que se está confirmando",
      }
    }
    const objetivoPre = pendientes.find((p) => p.id === paso.id)
    const validacion = await validarSlotLibre(
      supabase,
      paso.fecha_hora,
      modalidad,
      paso.id,
      objetivoPre?.duracion_minutos ?? DURACION_MINUTOS,
    )
    if (!validacion.ok) {
      return {
        ok: false,
        status: 409,
        error: validacion.error ?? "El bloque destino ya tiene una cita aceptada",
      }
    }
  }

  let resueltas = 0
  for (const paso of resolucion ?? []) {
    const objetivo = pendientes.find((p) => p.id === paso.id)
    if (!objetivo) {
      return { ok: false, status: 422, error: "La resolución no cubre todas las citas en espera" }
    }

    if (paso.accion === "eliminar") {
      const { error: delError } = await supabase.from(tableName).delete().eq("id", paso.id)
      if (delError) return { ok: false, status: 500, error: delError.message }
      resueltas += 1
      continue
    }

    if (!paso.fecha_hora) {
      return { ok: false, status: 422, error: "Indica el bloque destino para mover la cita" }
    }
    // El destino ya quedó validado en la prevalidación: aquí solo se escribe.
    const destino = new Date(paso.fecha_hora as string)
    if (Number.isNaN(destino.getTime())) {
      return { ok: false, status: 422, error: "Bloque destino no válido" }
    }
    const { error: moveError } = await supabase
      .from(tableName)
      .update({
        fecha_hora: destino.toISOString(),
        fecha_hora_anterior: objetivo.fecha_hora,
        movida: true,
      })
      .eq("id", paso.id)
    if (moveError) return { ok: false, status: 500, error: moveError.message }
    resueltas += 1
  }

  const { data: actualizada, error: updError } = await supabase
    .from(tableName)
    .update({ estado: "aceptada" })
    .eq("id", cita.id)
    .select()
    .single()
  if (updError) return { ok: false, status: 500, error: updError.message }

  return { ok: true, cita: actualizada as Cita, resueltas }
}
