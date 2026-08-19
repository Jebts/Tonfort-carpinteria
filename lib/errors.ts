// Utilidades para no filtrar detalles internos al cliente.

export function sanitizeError(err: unknown, fallback = "Error interno"): string {
  if (!err) return fallback
  if (err instanceof Error) {
    const msg = err.message
    if (/violates|duplicate|relation|column|constraint|pg/i.test(msg)) {
      return fallback
    }
    return msg
  }
  return fallback
}
