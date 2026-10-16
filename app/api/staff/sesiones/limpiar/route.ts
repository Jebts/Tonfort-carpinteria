import { type NextRequest, NextResponse } from "next/server"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

// POST /api/staff/sesiones/limpiar
// Borra sesiones expiradas y las revocadas con más de 7 días. Solo admin.
export async function POST(req: NextRequest) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const ahora = new Date().toISOString()
  const haceSieteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from("sesiones_staff").delete().lt("expires_at", ahora)
  await supabase.from("sesiones_staff").delete().eq("revocado", true).lt("creado_en", haceSieteDias)

  return NextResponse.json({ ok: true })
}
