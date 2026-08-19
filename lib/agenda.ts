import {
  startOfDay,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns"

// Configuración de la agenda de la carpintería.
// Ajustable por el equipo: días y bloques de 120 min.
// 0 = domingo, 1 = lunes, ... 6 = sábado.
export const DIAS_LABORALES = [1, 2, 3, 4, 5, 6] // Lun–Sáb

export const DURACION_MINUTOS = 120

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
  return parseISO(key.replace(" ", "T"))
}

// ¿Está el slot en el pasado respecto a ahora? (para deshabilitar reservas)
export function slotEnPasado(date: Date): boolean {
  return date.getTime() < Date.now()
}

export function enRango(d: Date, desde: Date, hasta: Date): boolean {
  return isWithinInterval(d, { start: desde, end: hasta })
}
