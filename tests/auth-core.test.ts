import { describe, it, expect, beforeEach } from "vitest"
import { createHmac } from "crypto"
import {
  COOKIE_NAME,
  firmarSesion,
  verificarToken,
  verifyPassword,
  hashPasswordForEnv,
  type Sesion,
} from "@/lib/auth-core"

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-auth"
  delete process.env.STAFF_CREDENTIALS
})

function firmarExpirado(s: Sesion): string {
  const secret = process.env.SESSION_SECRET!
  const payload = Buffer.from(
    JSON.stringify({ ...s, exp: Date.now() - 1000 }),
  ).toString("base64url")
  const sig = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

describe("COOKIE_NAME", () => {
  it("es tonfort_staff", () => {
    expect(COOKIE_NAME).toBe("tonfort_staff")
  })
})

describe("firmarSesion / verificarToken", () => {
  it("roundtrip válido", () => {
    const sesion: Sesion = { id: "test-id", usuario: "admin", nombre: "Edwin", rol: "admin" }
    const token = firmarSesion(sesion)
    const res = verificarToken(token)
    expect(res.ok).toBe(true)
    expect(res.sesion).toEqual(sesion)
  })

  it("token expirado → ok:false", () => {
    const token = firmarExpirado({ id: "test-id", usuario: "admin", nombre: "Edwin", rol: "admin" })
    expect(verificarToken(token).ok).toBe(false)
  })

  it("token alterado → ok:false", () => {
    const token = firmarSesion({ id: "test-id", usuario: "admin", nombre: "Edwin", rol: "admin" })
    const [payload, sig] = token.split(".")
    const alterado = `${payload.slice(0, -1)}X.${sig}`
    expect(verificarToken(alterado).ok).toBe(false)
  })

  it("token vacío/nulo → ok:false", () => {
    expect(verificarToken("").ok).toBe(false)
    expect(verificarToken(null).ok).toBe(false)
    expect(verificarToken(undefined).ok).toBe(false)
  })
})

describe("verifyPassword", () => {
  it("positivo con hash generado", async () => {
    const hash = await hashPasswordForEnv("secreto123")
    expect(await verifyPassword("secreto123", hash)).toBe(true)
  })

  it("negativo con password incorrecto", async () => {
    const hash = await hashPasswordForEnv("secreto123")
    expect(await verifyPassword("otra", hash)).toBe(false)
  })

  it("formato inválido → false", async () => {
    expect(await verifyPassword("x", "noeshash")).toBe(false)
  })
})
