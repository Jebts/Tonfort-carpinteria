import { type NextRequest, NextResponse } from "next/server"
import { getSesion, requireStaff } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

// GET /api/staff/sesiones
// Lista sesiones activas del usuario autenticado. Si es admin y se pasa
// `?usuario_id=`, lista las de ese usuario (admin ve todas).
export async function GET(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const sesion = getSesion(req)
  const rol = sesion?.rol
  const url = new URL(req.url)
  const usuarioIdParam = url.searchParams.get("usuario_id")

  let usuarioId = sesion?.id ?? null
  if (rol === "admin" && usuarioIdParam) {
    usuarioId = usuarioIdParam
  } else if (usuarioIdParam) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const ahora = new Date().toISOString()

  const { data, error } = await supabase
    .from("sesiones_staff")
    .select("id, usuario_id, expires_at, revocado, creado_en, ip, user_agent")
    .eq("usuario_id", usuarioId)
    .eq("revocado", false)
    .gt("expires_at", ahora)
    .order("creado_en", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "No se pudieron listar las sesiones" }, { status: 500 })
  }

  return NextResponse.json({ sesiones: data ?? [] })
}
