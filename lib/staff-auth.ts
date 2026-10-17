import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getServiceSupabase } from "@/lib/supabase/server"
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  firmarSesion,
  verificarToken,
  type Sesion,
  type RolStaff,
} from "@/lib/auth-core"

export type { Sesion, UsuarioDB } from "@/lib/auth-core"

export {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  firmarSesion,
  verificarToken,
  hashPasswordForEnv,
} from "@/lib/auth-core"
export { validarCredencialesDB } from "@/lib/auth-db"

// Caché en memoria con TTL corto para evitar una ida a BD en cada request.
type SesionCacheEntry = { sesion: Sesion; expires: number }
const sesionCache = new Map<string, SesionCacheEntry>()
const CACHE_TTL_MS = 60 * 1000

// Lee y verifica la cookie firmada desde un NextRequest.
export function verificarSesion(req: NextRequest): { ok: boolean; sesion?: Sesion } {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return verificarToken(token)
}

/**
 * Verifica la sesión de un request: firma de cookie, existencia y vigencia de
 * la fila en `sesiones_staff`, que el usuario siga activo y resuelve el rol.
 * Usa caché en memoria con TTL de 60s por `session_id`. Si Supabase no está
 * configurado (entorno sin BD), degrada a verificación de solo cookie.
 */
export async function verificarSesionStaff(req: NextRequest): Promise<{
  ok: boolean
  sesion?: Sesion
  usuarioId?: string
}> {
  const { ok, sesion } = verificarSesion(req)
  if (!ok || !sesion) return { ok: false }

  const supabase = getServiceSupabase()
  if (!supabase) return { ok: true, sesion }

  const sessionId = sesion.session_id
  if (!sessionId) return { ok: false }

  const ahora = Date.now()
  const cache = sesionCache.get(sessionId)
  if (cache && cache.expires > ahora) return { ok: true, sesion: cache.sesion }

  const ahoraISO = new Date(ahora).toISOString()

  const { data: sesionDb, error: sesionError } = await supabase
    .from("sesiones_staff")
    .select("id, usuario_id, revocado, expires_at")
    .eq("id", sessionId)
    .eq("revocado", false)
    .gt("expires_at", ahoraISO)
    .maybeSingle()

  if (sesionError) {
    if (sesionError.code === "PGRST205" || /sesiones_staff/i.test(sesionError.message ?? "")) {
      return { ok: true, sesion }
    }
    sesionCache.delete(sessionId)
    return { ok: false }
  }
  if (!sesionDb) {
    sesionCache.delete(sessionId)
    return { ok: false }
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("activo, rol")
    .eq("id", sesionDb.usuario_id)
    .maybeSingle()

  if (usuarioError || !usuario || !usuario.activo) {
    sesionCache.delete(sessionId)
    return { ok: false }
  }

  const sesionConRol: Sesion = { ...sesion, rol: usuario.rol as RolStaff }
  sesionCache.set(sessionId, { sesion: sesionConRol, expires: ahora + CACHE_TTL_MS })
  return { ok: true, sesion: sesionConRol, usuarioId: sesionDb.usuario_id }
}

export function invalidarSesionCache(sessionId: string): void {
  sesionCache.delete(sessionId)
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

/**
 * Crea una fila en `sesiones_staff` y firma la cookie de sesión con el
 * `session_id` generado, para que la sesión sea revocable desde BD.
 * Si Supabase no está configurado, solo se firma la cookie (degradación).
 */
export async function crearSesionYCookie(
  res: NextResponse,
  usuarioId: string,
  rol: RolStaff,
  usuario: string,
  nombre: string,
  ip?: string | null,
  userAgent?: string | null
): Promise<void> {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000)

  const sesion: Sesion = {
    id: usuarioId,
    session_id: sessionId,
    usuario,
    nombre,
    rol,
  }

  const supabase = getServiceSupabase()
  if (supabase) {
    const token = firmarSesion(sesion)
    const tokenHash = createHash("sha256").update(token).digest("hex")
    await supabase.from("sesiones_staff").insert({
      id: sessionId,
      usuario_id: usuarioId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      revocado: false,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    })
  }

  setSessionCookie(res, sesion)
}

// Lectura de la sesión desde los cookies del servidor (Server Components / handlers).
export async function getSesionServer(): Promise<Sesion | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return verificarToken(token).sesion ?? null
}
