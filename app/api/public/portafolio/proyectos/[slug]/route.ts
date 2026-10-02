import { NextRequest, NextResponse } from "next/server"
import { getProyectoPublicadoPlano } from "@/lib/portfolio-service"

export const revalidate = 300

// GET /api/public/portafolio/proyectos/[slug]
// Payload plano de la página pública del proyecto: `{ proyecto, fotos, visor }`.
// No incluye `cliente` ni `asignado_a`: son datos internos de staff.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const result = await getProyectoPublicadoPlano(slug)

  if (!result) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(result)
}