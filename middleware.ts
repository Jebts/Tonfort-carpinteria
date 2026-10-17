import { NextResponse } from "next/server"
import { proxy } from "./proxy"
import { verificarSesionStaff, clearSessionCookie } from "./lib/staff-auth"

const esLogin = (pathname: string) =>
  pathname === "/staff/login" ||
  pathname === "/api/staff/login" ||
  pathname.startsWith("/api/staff/login/")

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url)

  // Paso 1: verificación de cookie (síncrona vía proxy)
  const proxyResult = await proxy(req as never)
  if (proxyResult.status !== 200) return proxyResult

  // Las rutas de login no requieren verificación de sesión en BD
  if (esLogin(pathname)) return NextResponse.next()

  // Paso 2: verificación en BD (sesión revocada, usuario activo)
  const { ok, sesion } = await verificarSesionStaff(req as never)
  if (!ok) {
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
