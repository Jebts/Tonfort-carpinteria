import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, verificarToken } from "@/lib/auth-core"

// Protege /staff/* (salvo /staff/login y /api/staff/login).
// proxy.ts corre en el runtime de Node.js (Next 16), así que verificarToken
// (HMAC con crypto de Node) funciona sin problemas de Edge.
// Si no hay cookie firmada válida:
//   - páginas → redirige a /staff/login
//   - API → 401 JSON

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const esLogin =
    pathname === "/staff/login" || pathname === "/api/staff/login"
  if (esLogin) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const { ok } = verificarToken(token)

  if (ok) return NextResponse.next()

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

export const config = {
  matcher: ["/staff/:path*", "/api/staff/:path*"],
}
