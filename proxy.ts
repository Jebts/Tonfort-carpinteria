import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, verificarToken } from "@/lib/auth-core"

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const esLogin =
    pathname === "/staff/login" ||
    pathname === "/api/staff/login" ||
    pathname.startsWith("/api/staff/login/")

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