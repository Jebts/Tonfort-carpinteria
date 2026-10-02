import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sanitizeError } from "@/lib/errors"
import { getServiceSupabase } from "@/lib/supabase/server"
import type { CotizacionConDetalles, CotizacionPropuesta } from "@/lib/supabase/types"

const tokenSchema = z.string().min(16).max(64)

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

async function obtenerPorToken(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  token: string,
) {
  const { data, error } = await supabase
    .from("cotizaciones")
    .select(detalleSelect)
    .eq("token", token)
    .maybeSingle()

  if (error) throw error
  return data as CotizacionConDetalles | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { token } = await params
  const parsed = tokenSchema.safeParse(token)
  if (!parsed.success) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
  }

  try {
    const cotizacion = await obtenerPorToken(supabase, parsed.data)
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
    }
    return NextResponse.json({ cotizacion })
  } catch (error) {
    console.error("[GET cotizacion token]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener cotización" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { token } = await params
  const parsedToken = tokenSchema.safeParse(token)
  if (!parsedToken.success) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = z
    .object({
      cotizacion_propuesta_id: z.string().uuid("Propuesta inválida"),
      seleccionada: z.boolean({ invalid_type_error: "El valor de selección debe ser booleano" }),
    })
    .safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  try {
    const cotizacion = await obtenerPorToken(supabase, parsedToken.data)
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
    }

    const propuestaBelongsToCotizacion = cotizacion.proyectos.cotizacion_productos.some((producto) =>
      producto.cotizacion_propuestas.some(
        (propuesta) => propuesta.id === parsed.data.cotizacion_propuesta_id,
      ),
    )
    if (!propuestaBelongsToCotizacion) {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("cotizacion_propuestas")
      .update({ seleccionada_por_cliente: parsed.data.seleccionada })
      .eq("id", parsed.data.cotizacion_propuesta_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ propuesta: data as CotizacionPropuesta })
  } catch (error) {
    console.error("[PATCH cotizacion token seleccion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al guardar selección" }, { status: 500 })
  }
}
