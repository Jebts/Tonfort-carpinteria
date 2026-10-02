import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import {
  COOKIE_NAME,
  firmarSesion,
  verificarToken,
  type Sesion,
  type RolStaff,
} from "@/lib/auth-core"

export type { Sesion, UsuarioDB } from "@/lib/auth-core"

export {
  COOKIE_NAME,
  firmarSesion,
  verificarToken,
  hashPasswordForEnv,
} from "@/lib/auth-core"
export { validarCredencialesDB } from "@/lib/auth-db"

// Lee y verifica la cookie firmada desde un NextRequest.
export function verificarSesion(req: NextRequest): { ok: boolean; sesion?: Sesion } {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return verificarToken(token)
}

// Para usar en Route Handlers: si no hay sesión válida, devuelve una respuesta 401.
export function requireStaff(req: NextRequest): NextResponse | null {
  const { ok } = verificarSesion(req)
  if (!ok) {
    return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  return null
}

// Para usar en Route Handlers: requiere sesión válida con un rol permitido.
export function requireRol(req: NextRequest, roles: RolStaff[]): NextResponse | null {
  const { ok, sesion } = verificarSesion(req)
  if (!ok || !sesion) {
    return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  if (!roles.includes(sesion.rol)) {
    return new NextResponse(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }
  return null
}

// Lee la sesión (con rol) desde un NextRequest, para lógica de autorización fina.
export function getSesion(req: NextRequest): Sesion | null {
  const { sesion } = verificarSesion(req)
  return sesion ?? null
}

// Escribe la cookie firmada en una NextResponse.
export function setSessionCookie(res: NextResponse, sesion: Sesion) {
  res.cookies.set(COOKIE_NAME, firmarSesion(sesion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

// Lectura de la sesión desde los cookies del servidor (Server Components / handlers).
export async function getSesionServer(): Promise<Sesion | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return verificarToken(token).sesion ?? null
}
