import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/administracion/portafolio/proyectos/[id]/propuestas
// Propuestas candidatas a visor: todas las de los productos del proyecto,
// con su producto y animaciones. El admin elige cuáles mostrar.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ propuestas: [] })
  }

  const { id } = await params

  // 1. Productos del proyecto (para filtrar sin depender del join embebido).
  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id")
    .eq("proyecto_id", id)

  if (productosError) {
    console.error("[GET propuestas] productos", sanitizeError(productosError))
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
  }

  if (!productos || productos.length === 0) {
    return NextResponse.json({ propuestas: [] })
  }

  const productoIds = productos.map((p) => p.id)

  // 2. Propuestas de esos productos, ordenadas.
  const { data, error } = await supabase
    .from("propuestas_3d")
    .select(`
      id, producto_id, titulo, descripcion, video_global_url, frame_centro_ms, estado, orden,
      producto:productos!inner(id, titulo),
      animaciones:propuestas_3d_animaciones(*)
    `)
    .in("producto_id", productoIds)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET propuestas]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener propuestas" }, { status: 500 })
  }

  return NextResponse.json({ propuestas: data ?? [] })
}