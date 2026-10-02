import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const h = vi.hoisted(() => ({ ok: true }))
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => () => (h.ok ? { ok: true } : { ok: false, retryAfterMs: 1000 }),
  getClientIp: () => null,
}))

vi.mock("@/lib/auth-db", () => ({
  validarCredencialesDB: vi.fn(async (email: string, pass: string) => {
    if (email === "admin@tonfort.local" && pass === "TonfortAdmin2026!") {
      return {
        id: "user-admin-1",
        usuario: "admin@tonfort.local",
        nombre: "Administrador",
        rol: "admin" as const,
      }
    }
    return null
  }),
}))

import { POST } from "@/app/api/staff/login/route"

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/staff/login", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-login-at-least-32-chars-long"
  h.ok = true
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/staff/login", () => {
  it("422 con cuerpo sin campos requeridos", async () => {
    const res = await post({})
    expect(res.status).toBe(422)
  })

  it("400 con JSON inválido", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/staff/login", { method: "POST", body: "{bad" }),
    )
    expect(res.status).toBe(400)
  })

  it("401 con credenciales incorrectas", async () => {
    const res = await post({ usuario: "admin@tonfort.local", password: "mala" })
    expect(res.status).toBe(401)
  })

  it("200 + Set-Cookie tonfort_staff (sin Secure en test)", async () => {
    const res = await post({ usuario: "admin@tonfort.local", password: "TonfortAdmin2026!" })
    expect(res.status).toBe(200)
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("tonfort_staff=")
    expect(cookie).not.toContain("Secure")
  })

  it("200 + Set-Cookie con Secure cuando NODE_ENV=production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await post({ usuario: "admin@tonfort.local", password: "TonfortAdmin2026!" })
    expect(res.status).toBe(200)
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("Secure")
  })

  it("429 por rate-limit", async () => {
    h.ok = false
    const res = await post({ usuario: "admin@tonfort.local", password: "cambiame" })
    expect(res.status).toBe(429)
  })
})
