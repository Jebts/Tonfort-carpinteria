import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import {
  COOKIE_NAME,
  firmarSesion,
  verificarToken,
  validarCredenciales,
  hashPasswordForEnv,
  type Sesion,
} from "@/lib/auth-core"

// Helpers Next.js para la cookie de staff (usa next/headers y next/server).
// La lógica de firma vive en lib/auth-core para que el middleware pueda reusarla
// sin importar next/headers.

export {
  COOKIE_NAME,
  firmarSesion,
  verificarToken,
  validarCredenciales,
  hashPasswordForEnv,
  type Sesion,
} from "@/lib/auth-core"

// Lee y verifica la cookie firmada desde un NextRequest.
export function verificarSesion(req: NextRequest): { ok: boolean; sesion?: Sesion } {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return verificarToken(token)
}

// Para usar en Route Handlers: si no hay sesión válida, devuelve una respuesta
// 401. Si es válida, devuelve null y puedes continuar.
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

// Escribe la cookie firmada en una NextResponse.
export function setSessionCookie(res: NextResponse, sesion: Sesion) {
  res.cookies.set(COOKIE_NAME, firmarSesion(sesion), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
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
