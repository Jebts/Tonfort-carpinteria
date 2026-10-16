import { describe, it, expect, vi, afterEach } from "vitest"
import { createRateLimiter, getClientIp } from "@/lib/rate-limit"

afterEach(() => {
  vi.useRealTimers()
})

describe("createRateLimiter", () => {
  it("permite `max` hits y luego bloquea con retryAfterMs>0", () => {
    vi.useFakeTimers()
    const limit = createRateLimiter({ max: 3, windowMs: 10_000 })
    expect(limit("k").ok).toBe(true)
    expect(limit("k").ok).toBe(true)
    expect(limit("k").ok).toBe(true)
    const bloqueado = limit("k")
    expect(bloqueado.ok).toBe(false)
    expect((bloqueado.retryAfterMs ?? 0)).toBeGreaterThan(0)
  })

  it("claves distintas son independientes", () => {
    vi.useFakeTimers()
    const limit = createRateLimiter({ max: 1, windowMs: 10_000 })
    expect(limit("a").ok).toBe(true)
    expect(limit("a").ok).toBe(false)
    expect(limit("b").ok).toBe(true)
  })

  it("resetea tras la ventana", () => {
    vi.useFakeTimers()
    const limit = createRateLimiter({ max: 1, windowMs: 1000 })
    expect(limit("k").ok).toBe(true)
    expect(limit("k").ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(limit("k").ok).toBe(true)
  })
})

describe("getClientIp", () => {
  it("toma el último valor de x-forwarded-for (lo escribe el proxy)", () => {
    const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) }
    expect(getClientIp(req)).toBe("5.6.7.8")
  })

  it("ignora un primer valor falsificado cuando hay salto de proxy", () => {
    const req = { headers: new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }) }
    expect(getClientIp(req)).toBe("10.0.0.1")
  })

  it("parsea x-real-ip cuando no hay x-forwarded-for", () => {
    const req = { headers: new Headers({ "x-real-ip": "9.9.9.9" }) }
    expect(getClientIp(req)).toBe("9.9.9.9")
  })

  it("retorna null si no hay headers", () => {
    const req = { headers: new Headers() }
    expect(getClientIp(req)).toBeNull()
  })
})
