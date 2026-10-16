// Rate limiter simple en memoria (por proceso).
// Para producción multi-instancia usar Redis o Postgres.
// Estructura: Map<key, number[]> donde number[] son timestamps de requests.

type RateLimitOptions = {
  max: number
  windowMs: number
}

export function createRateLimiter(opts: RateLimitOptions) {
  const store = new Map<string, number[]>()

  return function limit(key: string): { ok: boolean; retryAfterMs?: number } {
    const now = Date.now()
    const hits = store.get(key) ?? []
    const recent = hits.filter((t) => now - t < opts.windowMs)
    if (recent.length >= opts.max) {
      const oldest = recent[0]
      const retryAfterMs = opts.windowMs - (now - oldest)
      return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) }
    }
    recent.push(now)
    store.set(key, recent)
    return { ok: true }
  }
}

type HeadersLike = { get: (name: string) => string | null }

// IP del visitante. `x-forwarded-for` lo escribe el cliente *y* lo amplía cada
// proxy, así que se toma el ÚLTIMO valor (el que añade nuestro proxy), no el
// primero: si no, cualquiera podría elegir con qué IP se le cuenta el cupo.
export function getClientIp(req: { headers: HeadersLike }): string | null {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) {
    const last = xf.split(",").at(-1)?.trim()
    if (last) return last
  }
  const xri = req.headers.get("x-real-ip")
  if (xri) return xri
  return null
}
