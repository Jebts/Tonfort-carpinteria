import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"
import type { CotizacionConDetalles } from "@/lib/supabase/types"

const detalleSelect = `
  *,
  proyectos!inner(
    id,
    titulo,
    slug,
    clientes!inner(
      id,
      nombre,
      email
    ),
    cotizacion_productos(
      id,
      titulo,
      descripcion,
      orden,
      cotizacion_propuestas(
        id,
        titulo,
        descripcion,
        video_global_url,
        frame_centro_ms,
        precio_cotizacion,
        seleccionada_por_cliente,
        orden
      )
    )
  )
`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cotizacionId: string }> },
) {
  const auth = requireRol(_req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { cotizacionId } = await params

  try {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(detalleSelect)
      .eq("id", cotizacionId)
      .single()

    if (error) throw error
    return NextResponse.json({ cotizacion: data as CotizacionConDetalles })
  } catch (error) {
    console.error("[GET cotizacion id]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener cotización" }, { status: 500 })
  }
}
