// Configuración horaria del taller (compartida entre agenda pública y panel del equipo)

// Días laborales: Lunes (1) a Sábado (6). Domingo (0) cerrado.
export const WORKING_DAYS = [1, 2, 3, 4, 5, 6]

// Franjas horarias por hora, de 8:00 a 17:00 (último inicio 17:00).
export const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

export const SLOT_DURATION_MIN = 60

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const DAY_LABELS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]
export const MONTH_LABELS = [
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

/** Lunes de la semana que contiene `date` (a medianoche local). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day // retroceder hasta el lunes
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Devuelve los 6 días laborales (Lun–Sáb) de la semana de `date`. */
export function getWorkWeek(date: Date): Date[] {
  const monday = startOfWeek(date)
  return [0, 1, 2, 3, 4, 5].map((i) => addDays(monday, i))
}

/** Construye la fecha exacta de una franja. */
export function slotDate(day: Date, hour: number): Date {
  const d = new Date(day)
  d.setHours(hour, 0, 0, 0)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isWorkingDay(date: Date): boolean {
  return WORKING_DAYS.includes(date.getDay())
}

export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? "a.m." : "p.m."
  return `${h12}:00 ${suffix}`
}

export function formatLongDate(date: Date): string {
  return `${DAY_LABELS_LONG[date.getDay()]} ${date.getDate()} de ${MONTH_LABELS[date.getMonth()]}`
}

export function weekRangeLabel(week: Date[]): string {
  const first = week[0]
  const last = week[week.length - 1]
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} de ${MONTH_LABELS[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${first.getDate()} ${MONTH_LABELS[first.getMonth()]} – ${last.getDate()} ${MONTH_LABELS[last.getMonth()]} ${last.getFullYear()}`
}
