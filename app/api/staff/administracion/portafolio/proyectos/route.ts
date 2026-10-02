import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/administracion/portafolio/proyectos → admin lista todos los proyectos
export async function GET(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ proyectos: [] })

  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("orden", { ascending: true })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ proyectos: data ?? [] })
}