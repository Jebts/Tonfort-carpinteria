// Formateo compartido del flujo de agenda. El precio siempre viene de
// `modalidades_cita.costo`: aquí solo se formatea para mostrarlo.

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
export function formatearFechaLarga(date: Date): string {
  const texto = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
