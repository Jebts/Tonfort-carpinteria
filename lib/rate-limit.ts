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

export function getClientIp(req: { headers: Headers }): string | null {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) {
    const first = xf.split(",")[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get("x-real-ip")
  if (xri) return xri
  return null
}
