import { NextResponse, type NextRequest } from "next/server"

// Ruta legacy del flujo viejo de 4 pasos. 301 permanente al flujo actual:
// los enlaces viejos y los buscadores siguen funcionando.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/agenda/modalidad", req.nextUrl.origin), 301)
}
