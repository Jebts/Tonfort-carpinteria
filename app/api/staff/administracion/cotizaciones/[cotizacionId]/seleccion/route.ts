import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"
import type { CotizacionPropuesta } from "@/lib/supabase/types"

const seleccionSchema = z.object({
  cotizacion_propuesta_id: z.string().uuid("Propuesta inválida"),
  seleccionada: z.boolean({ invalid_type_error: "El valor de selección debe ser booleano" }),
})

async function validarPropuesta(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  cotizacionPropuestaId: string,
) {
  const { data, error } = await supabase
    .from("cotizacion_propuestas")
    .select("id")
    .eq("id", cotizacionPropuestaId)
    .maybeSingle()

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

  const parsed = seleccionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { cotizacion_propuesta_id: cotizacionPropuestaId, seleccionada } = parsed.data

  try {
    const propuesta = await validarPropuesta(supabase, cotizacionPropuestaId)
    if (!propuesta) {
      return NextResponse.json(
        { error: "La propuesta no existe" },
        { status: 404 },
      )
    }

    const { data, error } = await supabase
      .from("cotizacion_propuestas")
      .update({ seleccionada_por_cliente: seleccionada })
      .eq("id", cotizacionPropuestaId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ propuesta: data as CotizacionPropuesta })
  } catch (error) {
    console.error("[PATCH cotizacion seleccion]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar selección" }, { status: 500 })
  }
}
