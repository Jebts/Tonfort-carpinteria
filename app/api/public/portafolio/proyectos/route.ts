import { NextRequest, NextResponse } from "next/server"
import { getProyectosPublicados } from "@/lib/portfolio-service"
import { esCategoriaMueble } from "@/lib/categorias"
import { SEDES, type SedeTaller } from "@/lib/supabase/types"

export const revalidate = 300

const SEDES_VALIDAS = new Set<string>(SEDES.map((s) => s.value))

// GET /api/public/portafolio/proyectos?sede=&categoria=
// Lista plana de proyectos publicados. Los filtros opcionales se validan
// contra los catálogos cerrados: un valor desconocido se ignora.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const sedeParam = searchParams.get("sede")
  const sede = sedeParam && SEDES_VALIDAS.has(sedeParam) ? (sedeParam as SedeTaller) : null

  const categoriaParam = searchParams.get("categoria")
  const categoria =
    categoriaParam && esCategoriaMueble(categoriaParam) ? categoriaParam : null

  const proyectos = await getProyectosPublicados({ sede, categoria })

  return NextResponse.json({ proyectos })
}