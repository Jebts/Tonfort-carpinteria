import { NextRequest } from "next/server"
import { COOKIE_NAME, firmarSesion, type Sesion } from "@/lib/auth-core"

// Crea un token de sesión firmado válido (requiere SESSION_SECRET en env).
export function makeToken(sesion: Sesion = { id: "test-id", usuario: "admin", nombre: "Admin", rol: "admin" }): string {
  if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = "test-secret-route"
  return firmarSesion(sesion)
}

// NextRequest con cookie de staff válida.
export function authedRequest(url: string, init: RequestInit = {}): NextRequest {
  const token = makeToken()
  const headers = new Headers(init.headers)
  headers.set("cookie", `${COOKIE_NAME}=${token}`)
  return new NextRequest(url, { ...init, headers } as never)
}

// NextRequest con una cookie arbitraria.
export function requestWithCookie(url: string, cookie: string, init: RequestInit = {}): NextRequest {
  const headers = new Headers(init.headers)
  headers.set("cookie", cookie)
  return new NextRequest(url, { ...init, headers } as never)
}
