import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol, getSesion, type Sesion } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"

type DisenoProjectAccess = {
  ok: true
  supabase: SupabaseClient
  session: Sesion
}

type DisenoProjectAccessError = {
  ok: false
  response: NextResponse
}

export type DisenoProjectAccessResult = DisenoProjectAccess | DisenoProjectAccessError

export async function getDisenoProjectAccess(
  req: NextRequest,
  projectId: string,
): Promise<DisenoProjectAccessResult> {
  const denied = requireRol(req, ["admin", "disenador"])
  if (denied) return { ok: false, response: denied }

  const session = getSesion(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    }
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Backend no configurado" }, { status: 500 }),
    }
  }

  let query = supabase.from("proyectos").select("id").eq("id", projectId)
  if (session.rol === "disenador") {
    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", session.usuario)
      .maybeSingle()

    if (usuarioError || !usuario) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 }),
      }
    }

    query = query.eq("asignado_a", usuario.id)
  }

  const { data: proyecto, error: proyectoError } = await query.maybeSingle()
  if (proyectoError) {
    console.error("[diseno project access]", sanitizeError(proyectoError))
    return {
      ok: false,
      response: NextResponse.json({ error: "Error al verificar proyecto" }, { status: 500 }),
    }
  }

  if (!proyecto) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 }),
    }
  }

  return { ok: true, supabase, session }
}
