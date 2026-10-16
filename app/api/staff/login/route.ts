import { NextRequest, NextResponse } from "next/server"
import { validarCredencialesDB } from "@/lib/auth-db"
import { crearSesionYCookie } from "@/lib/staff-auth"
import { loginSchema } from "@/lib/validators"
import { createRateLimiter, getClientIp } from "@/lib/rate-limit"

const loginLimiter = createRateLimiter({ max: 10, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limitKey = ip ?? "anonymous"
  const limit = loginLimiter(limitKey)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 0) / 1000)) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Credenciales requeridas" }, { status: 422 })
  }

  const identificador = String(parsed.data.usuario).trim().toLowerCase()
  const password = String(parsed.data.password)

  const sesion = await validarCredencialesDB(identificador, password)
  if (!sesion) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, sesion })
  await crearSesionYCookie(res, sesion.id, sesion.rol, sesion.usuario, sesion.nombre, ip)
  return res
}
