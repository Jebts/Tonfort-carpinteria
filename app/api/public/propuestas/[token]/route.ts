import { NextRequest, NextResponse } from "next/server"
import { getPropuestaByToken } from "@/lib/portfolio-service"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const result = await getPropuestaByToken(token)

  if (!result) {
    return NextResponse.json({ error: "Link no encontrado o inactivo" }, { status: 404 })
  }

  return NextResponse.json({
    proyecto: result.proyecto,
    producto: result.producto,
    propuesta: result.propuesta,
    animaciones: result.animaciones,
  })
}