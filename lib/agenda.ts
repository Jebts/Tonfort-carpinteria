// Shared scheduling config + helpers for the public and staff agendas.

// Each appointment lasts 2 hours. Slots start at these hours (24h).
export const SLOT_HOURS = [9, 11, 14, 16, 18]
export const SLOT_DURATION_HOURS = 2

// Working days: Monday (1) through Saturday (6). Sunday (0) is closed.
export const WORKING_DAYS = [1, 2, 3, 4, 5, 6]

export type AppointmentStatus = "en_espera" | "aceptada" | "cancelada"

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; dot: string; badge: string; help: string }
> = {
  aceptada: {
    label: "Confirmada",
    dot: "bg-brand-navy",
    badge: "bg-brand-navy text-white",
    help: "Cita ya confirmada. No está disponible.",
  },
  en_espera: {
    label: "En espera",
    dot: "bg-amber-500",
    badge: "bg-amber-500 text-white",
    help: "Solicitada por alguien. Aún puedes postularte a este turno.",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-rose-500",
    badge: "bg-rose-500 text-white",
    help: "Cita cancelada.",
  },
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

export const dayName = (d: Date) => DAY_NAMES[d.getDay()]
export const dayNameShort = (d: Date) => DAY_NAMES_SHORT[d.getDay()]
export const monthName = (d: Date) => MONTH_NAMES[d.getMonth()]

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

// Monday as the first day of the week.
export function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

// The 6 working days (Mon–Sat) for the week containing `d`.
export function weekWorkingDays(d: Date) {
  const start = startOfWeek(d)
  return WORKING_DAYS.map((_, i) => addDays(start, i))
}

export function slotDate(day: Date, hour: number) {
  const x = startOfDay(day)
  x.setHours(hour, 0, 0, 0)
  return x
}

export function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am"
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:00 ${suffix}`
}

export function formatSlotRange(hour: number) {
  return `${formatHour(hour)} – ${formatHour(hour + SLOT_DURATION_HOURS)}`
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Full calendar grid (weeks x 7) for the month containing `d`, Monday-first.
export function monthGridDays(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i))
  return days
}

export function longDate(d: Date) {
  return `${dayName(d)} ${d.getDate()} de ${monthName(d)}, ${d.getFullYear()}`
}
