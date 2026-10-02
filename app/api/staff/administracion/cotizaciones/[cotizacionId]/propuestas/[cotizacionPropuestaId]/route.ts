import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cotizacionId: string; cotizacionPropuestaId: string }> },
) {
  const auth = requireRol(_req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { cotizacionPropuestaId } = await params

  try {
    const { error } = await supabase
      .from("cotizacion_propuestas")
      .delete()
      .eq("id", cotizacionPropuestaId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE cotizacion propuesta]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar propuesta" }, { status: 500 })
  }
}
