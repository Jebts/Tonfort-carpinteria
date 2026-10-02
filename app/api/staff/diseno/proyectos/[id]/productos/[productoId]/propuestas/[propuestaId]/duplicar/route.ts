import { NextRequest, NextResponse } from "next/server"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { sanitizeError } from "@/lib/errors"
import type { Propuesta3D, Propuesta3DAnimacion } from "@/lib/supabase/types"

// POST /api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/duplicar
// Duplica una propuesta (y sus animaciones) dentro del mismo producto.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Fetch original proposal (must belong to the product)
  const { data: original, error: originalError } = await access.supabase
    .from("propuestas_3d")
    .select("*")
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .maybeSingle()

  if (originalError || !original) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  // Calculate max orden for the same producto_id
  const { data: maxOrdenData, error: maxOrdenError } = await access.supabase
    .from("propuestas_3d")
    .select("orden")
    .eq("producto_id", productoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxOrdenError) {
    console.error("[duplicar]", sanitizeError(maxOrdenError))
    return NextResponse.json({ error: "Error al calcular orden" }, { status: 500 })
  }

  const nuevoOrden = (maxOrdenData?.orden ?? 0) + 1

  // Fetch existing animaciones for the original proposal
  const { data: animacionesOriginales, error: animError } = await access.supabase
    .from("propuestas_3d_animaciones")
    .select("*")
    .eq("propuesta_id", propuestaId)
    .order("orden", { ascending: true })

  if (animError) {
    console.error("[duplicar animaciones]", sanitizeError(animError))
    return NextResponse.json({ error: "Error al obtener animaciones" }, { status: 500 })
  }

  const newProposalId = crypto.randomUUID()

  // Create clone with modified fields (reset to borrador, no link, no public)
  const clone: Partial<Propuesta3D> & { id: string } = {
    ...original,
    id: newProposalId,
    titulo: `${original.titulo} (Copia)`,
    estado: "borrador",
    link_activo: false,
    link_token: null,
    publicada_portafolio: false,
    orden: nuevoOrden,
  }

  const { data, error } = await access.supabase
    .from("propuestas_3d")
    .insert(clone)
    .select()
    .single()

  if (error) {
    console.error("[duplicar]", sanitizeError(error))
    return NextResponse.json({ error: "Error al duplicar propuesta" }, { status: 500 })
  }

  // Clone animaciones (same URLs, new ids)
  if (animacionesOriginales && animacionesOriginales.length > 0) {
    const clonedAnimaciones = animacionesOriginales.map((animacion: Propuesta3DAnimacion, index: number) => ({
      propuesta_id: newProposalId,
      titulo: animacion.titulo,
      descripcion: animacion.descripcion ?? null,
      video_movimiento_url: animacion.video_movimiento_url,
      video_accion_url: animacion.video_accion_url ?? null,
      velocidad_normal: animacion.velocidad_normal,
      velocidad_inversa: animacion.velocidad_inversa,
      orden: index,
    }))

    const { error: animCloneError } = await access.supabase
      .from("propuestas_3d_animaciones")
      .insert(clonedAnimaciones)

    if (animCloneError) {
      console.error("[duplicar animaciones clone]", sanitizeError(animCloneError))
      // Non-fatal: proposal already cloned, but log for audit
    }
  }

  return NextResponse.json({ propuesta: data as Propuesta3D })
}