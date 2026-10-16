import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, verificarToken } from "@/lib/auth-core"
import { verificarSesionStaff, clearSessionCookie } from "@/lib/staff-auth"

const esLogin = (pathname: string) =>
  pathname === "/staff/login" ||
  pathname === "/api/staff/login" ||
  pathname.startsWith("/api/staff/login/")

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Paso 1: verificación de cookie (síncrona)
  if (esLogin(pathname)) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const { ok } = verificarToken(token)

  if (!ok) {
    if (pathname.startsWith("/api/staff")) {
      return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }

    const url = req.nextUrl.clone()
    url.pathname = "/staff/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Paso 2: verificación en BD (sesión revocada, usuario activo)
  const { ok: okSesion, sesion } = await verificarSesionStaff(req as never)
  if (!okSesion) {
    const res = NextResponse.redirect(new URL("/staff/login", req.url))
    clearSessionCookie(res)
    return res
  }

  // Paso 3: restricciones de rol por ruta
  const rol = sesion?.rol
  if (pathname.startsWith("/staff/administracion") && rol !== "admin") {
    return new NextResponse(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }
  if (pathname.startsWith("/staff/gestion") && !["admin", "asesor"].includes(rol ?? "")) {
    return new NextResponse(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }
  if (pathname.startsWith("/staff/diseno") && !["admin", "disenador"].includes(rol ?? "")) {
    return new NextResponse(JSON.stringify({ error: "Prohibido" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/staff/:path*", "/api/staff/:path*"],
}