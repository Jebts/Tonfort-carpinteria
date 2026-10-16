import { type NextRequest, NextResponse } from "next/server"
import { clearSessionCookie, getSesion, invalidarSesionCache } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"

// POST /api/staff/logout
export async function POST(req?: NextRequest) {
  const supabase = getServiceSupabase()
  const sesion = req ? getSesion(req) : null
  if (supabase && sesion?.session_id) {
    await supabase.from("sesiones_staff").update({ revocado: true }).eq("id", sesion.session_id)
    invalidarSesionCache(sesion.session_id)
  }

  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
