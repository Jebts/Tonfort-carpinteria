// Formateo compartido del flujo de agenda. El precio siempre viene de
// `modalidades_cita.costo`: aquí solo se formatea para mostrarlo.

import { inicioSemana } from "@/lib/agenda"

export function formatPrecio(costo: number): string {
  if (costo <= 0) return "Gratis"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(costo)
}

// Los slots se generan y guardan en UTC (ver `lib/agenda.ts`), así que el
// formateo en español también es explícito en UTC para no correr de día.
// El formateador es de módulo: se llama una vez por celda de la retícula y
// construirlo en cada render salía caro.
const FMT_LARGA = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
})

export function formatearFechaLarga(date: Date): string {
  const texto = FMT_LARGA.format(date)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// "12 – 18 de octubre de 2026" (mismo mes) o "27 de octubre – 2 de noviembre de
// 2026" (meses distintos). Siempre en UTC: la agenda se calcula en UTC y la
// grilla muestra lunes–sábado de esa semana.
const FMT_DIA_MES = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
})

export function formatearRangoSemana(semana: Date): string {
  const lunes = inicioSemana(semana)
  const año = lunes.getUTCFullYear()
  const domingo = new Date(Date.UTC(año, lunes.getUTCMonth(), lunes.getUTCDate() + 6))
  const fmt = FMT_DIA_MES
  const izq = fmt.format(lunes)
  const der = fmt.format(domingo)
  const rango = lunes.getUTCMonth() === domingo.getUTCMonth()
    ? `${lunes.getUTCDate()} – ${der}`
    : `${izq} – ${der}`
  return `${rango} de ${año}`
}
