import {
  startOfDay,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns"
import type { CitaEnSlot } from "@/lib/citas-service"
import type { EstadoSlot } from "@/lib/supabase/types"

// Configuración de la agenda de la carpintería.
// Las citas duran 90 min (1 h 30 m). Los bloques de la retícula siguen siendo
// de 2 h (120 min); los 30 min restantes de cada bloque son la gabela
// (tolerancia/gracia) entre citas.
// 0 = domingo, 1 = lunes, ... 6 = sábado.
export const DIAS_LABORALES = [1, 2, 3, 4, 5, 6] // Lun–Sáb

export const DURACION_MINUTOS = 90

// Gabela (tolerancia/gracia) entre citas, en minutos. Es el sobrante de cada
// bloque de 2 h una vez descontados los 90 min de la cita.
export const GABELA_MINUTOS = 30

// Bloques fijos de 2 h.
export const BLOQUES: { inicio: string; fin: string; label: string }[] = [
  { inicio: "08:00", fin: "10:00", label: "08:00 – 10:00" },
  { inicio: "10:00", fin: "12:00", label: "10:00 – 12:00" },
  { inicio: "14:00", fin: "16:00", label: "14:00 – 16:00" },
  { inicio: "16:00", fin: "18:00", label: "16:00 – 18:00" },
]

function parseHora(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map(Number)
  return { h, m }
}

// Devuelve los Date UTC de todos los slots vacíos entre `desde` y `hasta`.
// Solo considera días laborales y bloques configurados.
export function generarSlots(desde: Date, hasta: Date): Date[] {
  const inicio = startOfDay(desde)
  const fin = startOfDay(hasta)
  const dias = eachDayOfInterval({ start: inicio, end: fin })

  const slots: Date[] = []
  for (const dia of dias) {
    const dow = dia.getDay()
    if (!DIAS_LABORALES.includes(dow)) continue
    for (const bloque of BLOQUES) {
      const { h, m } = parseHora(bloque.inicio)
      const slot = new Date(dia)
      slot.setUTCHours(h, m, 0, 0)
      if (slot >= desde && slot <= hasta) {
        slots.push(slot)
      }
    }
  }
  slots.sort((a, b) => a.getTime() - b.getTime())
  return slots
}

// Slots de un solo día (para la vista mensual/semanal por día).
export function slotsDelDia(dia: Date): Date[] {
  return generarSlots(startOfDay(dia), startOfDay(dia))
}

export function esDiaLaboral(dia: Date): boolean {
  return DIAS_LABORALES.includes(dia.getDay())
}

export function formatearHora(date: Date): string {
  return format(date, "HH:mm")
}

export function formatearDia(date: Date): string {
  return format(date, "EEE d MMM", { /* locale por defecto en: ajustamos abajo */ } as never)
}

// Clave "yyyy-MM-dd HH:mm" (UTC) para identificar un slot.
export function slotKey(date: Date): string {
  const iso = date.toISOString()
  return `${iso.slice(0, 4)}-${iso.slice(5, 7)}-${iso.slice(8, 10)} ${iso.slice(11, 13)}:${iso.slice(14, 16)}`
}

export function parseSlotKey(key: string): Date {
  // La clave se genera con toISOString() (UTC); la interpretamos como UTC.
  return parseISO(`${key.replace(" ", "T")}Z`)
}

// ¿Está el slot en el pasado respecto a ahora? (para deshabilitar reservas)
export function slotEnPasado(date: Date): boolean {
  return date.getTime() < Date.now()
}

export function enRango(d: Date, desde: Date, hasta: Date): boolean {
  return isWithinInterval(d, { start: desde, end: hasta })
}

// Lunes de la semana de `base`, en UTC. Todo el flujo de agenda (slots, citas,
// grillas) se calcula en UTC, así que el inicio de semana también: con hora
// local una fecha ya normalizada (medianoche UTC = domingo 19:00 en Bogotá)
// devolvía el lunes de la semana anterior. La función es idempotente.
export function inicioSemana(base: Date): Date {
  const dow = base.getUTCDay() // 0 = domingo, 1 = lunes
  const diasDesdeLunes = (dow + 6) % 7
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() - diasDesdeLunes,
    ),
  )
}

// Encabezados de la grilla compartida (web y staff).
export const DIAS_CORTOS = [
  { dow: 1, label: "Lun" },
  { dow: 2, label: "Mar" },
  { dow: 3, label: "Mié" },
  { dow: 4, label: "Jue" },
  { dow: 5, label: "Vie" },
  { dow: 6, label: "Sáb" },
] as const

// Fecha UTC de una celda de la grilla: semana + día de la semana + bloque.
export function fechaDeCelda(semana: Date, dow: number, bloqueInicio: string): Date {
  return new Date(
    Date.UTC(
      semana.getUTCFullYear(),
      semana.getUTCMonth(),
      semana.getUTCDate() + (dow - 1),
      Number(bloqueInicio.slice(0, 2)),
      Number(bloqueInicio.slice(3, 5)),
    ),
  )
}

// Color del círculo de contador según el tipo de cita: el círculo resume el
// bloque y su color dice de qué tipo son las citas que contiene.
export function colorTipoCita(slug: string | null | undefined): {
  clase: string
  nombre: string
} {
  switch (slug) {
    case "virtual":
      return { clase: "bg-blue-500 text-white", nombre: "virtual" }
    case "presencial":
      return { clase: "bg-emerald-500 text-white", nombre: "presencial" }
    default:
      // Sin modalidad (citas internas que staff crea sin catálogo).
      return { clase: "bg-purple-500 text-white", nombre: "interna" }
  }
}

export interface CeldaGrilla {
  /** `slotKey(fecha)`: identifica el bloque en toda la app. */
  clave: string
  /** Fecha UTC del inicio del bloque. */
  fecha: Date
  pasado: boolean
  laborable: boolean
  estado: EstadoSlot | undefined
  citas: CitaEnSlot[]
}

// Celdas (día × bloque) de una semana, en orden de fila: cada `BLOQUES` consecutivo
// cubre los `DIAS_CORTOS` días de esa fila. Centraliza la aritmética UTC que antes
// estaba duplicada en el calendario público y en la agenda de staff.
// Acepta cualquier fecha de la semana como entrada (normaliza al lunes).
export function celdasDeSemana(
  semana: Date,
  datosPorClave: Map<string, { estado?: EstadoSlot; citas?: CitaEnSlot[] }>,
  ahora: Date = new Date(),
): CeldaGrilla[] {
  const lunes = inicioSemana(semana)
  const celdas: CeldaGrilla[] = []
  for (const bloque of BLOQUES) {
    for (const dia of DIAS_CORTOS) {
      const fecha = fechaDeCelda(lunes, dia.dow, bloque.inicio)
      const datos = datosPorClave.get(slotKey(fecha))
      celdas.push({
        clave: slotKey(fecha),
        fecha,
        pasado: fecha.getTime() < ahora.getTime(),
        laborable: DIAS_LABORALES.includes(fecha.getUTCDay()),
        estado: datos?.estado,
        citas: datos?.citas ?? [],
      })
    }
  }
  return celdas
}
