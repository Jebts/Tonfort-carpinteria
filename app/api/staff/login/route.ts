import { NextRequest, NextResponse } from "next/server"
import { validarCredenciales } from "@/lib/auth-core"
import { setSessionCookie } from "@/lib/staff-auth"
import { loginSchema } from "@/lib/validators"
import { createRateLimiter, getClientIp } from "@/lib/rate-limit"

const loginLimiter = createRateLimiter({ max: 10, windowMs: 60_000 })

// POST /api/staff/login  { usuario, password }
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

  const parse = loginSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Credenciales requeridas" }, { status: 422 })
  }

  const sesion = await validarCredenciales(parse.data.usuario, parse.data.password)
  if (!sesion) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, sesion })
  setSessionCookie(res, sesion)
  return res
}
