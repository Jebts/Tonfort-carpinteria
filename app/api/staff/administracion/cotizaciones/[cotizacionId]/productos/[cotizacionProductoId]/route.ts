import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cotizacionId: string; cotizacionProductoId: string }> },
) {
  const auth = requireRol(_req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { cotizacionProductoId } = await params

  try {
    const { error } = await supabase
      .from("cotizacion_productos")
      .delete()
      .eq("id", cotizacionProductoId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE cotizacion producto]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 })
  }
}
