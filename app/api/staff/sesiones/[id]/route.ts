import { type NextRequest, NextResponse } from "next/server"
import { getSesion, requireStaff, invalidarSesionCache } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

// DELETE /api/staff/sesiones/[id]
// Revoca una sesión específica. Solo el dueño o un admin pueden revocarla.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id: sessionId } = await params
  const sesion = getSesion(req)

  const { data: sesionDb, error: sesionError } = await supabase
    .from("sesiones_staff")
    .select("id, usuario_id, revocado")
    .eq("id", sessionId)
    .maybeSingle()

  if (sesionError || !sesionDb) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }

  const esPropia = sesionDb.usuario_id === sesion?.id
  const esAdmin = sesion?.rol === "admin"
  if (!esPropia && !esAdmin) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  await supabase.from("sesiones_staff").update({ revocado: true }).eq("id", sessionId)
  invalidarSesionCache(sessionId)

  return NextResponse.json({ ok: true })
}
