import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"
import type { CotizacionPropuesta } from "@/lib/supabase/types"

const precioSchema = z.object({
  cotizacion_propuesta_id: z.string().uuid("Propuesta inválida"),
  precio: z.number().nonnegative("El precio no puede ser negativo").finite("El precio no es válido"),
})

async function validarPropuesta(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  cotizacionId: string,
  cotizacionPropuestaId: string,
) {
  const { data, error } = await supabase
    .from("cotizacion_propuestas")
    .select("id, cotizacion_producto_id")
    .eq("id", cotizacionPropuestaId)
    .single()

  if (error) throw error
  return data as CotizacionPropuesta | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cotizacionId: string }> },
) {
  const auth = requireRol(request, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = precioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { cotizacionId } = await params
  const { cotizacion_propuesta_id: cotizacionPropuestaId, precio } = parsed.data

  try {
    const propuesta = await validarPropuesta(supabase, cotizacionId, cotizacionPropuestaId)
    if (!propuesta) {
      return NextResponse.json(
        { error: "La propuesta no pertenece a esta cotización" },
        { status: 404 },
      )
    }

    const { data, error } = await supabase
      .from("cotizacion_propuestas")
      .update({ precio_cotizacion: precio })
      .eq("id", cotizacionPropuestaId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ propuesta: data as CotizacionPropuesta })
  } catch (error) {
    console.error("[PATCH cotizacion precio]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar precio" }, { status: 500 })
  }
}
