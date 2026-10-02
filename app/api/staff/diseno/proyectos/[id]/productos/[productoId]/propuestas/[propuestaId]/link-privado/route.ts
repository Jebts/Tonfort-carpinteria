import { NextRequest, NextResponse } from "next/server"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { sanitizeError } from "@/lib/errors"
import type { Propuesta3D } from "@/lib/supabase/types"
import { randomBytes } from "crypto"

// POST /api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/link-privado
// Activa/desactiva el link privado de una propuesta.
// Requiere video_global_url + frame_centro_ms para activar.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || !("link_activo" in (body as Record<string, unknown>))) {
    return NextResponse.json({ error: "Campo link_activo requerido" }, { status: 422 })
  }

  const activo = (body as { link_activo: unknown }).link_activo
  if (typeof activo !== "boolean") {
    return NextResponse.json({ error: "link_activo debe ser booleano" }, { status: 422 })
  }

  // Fetch current proposal
  const { data: propuesta, error: propError } = await access.supabase
    .from("propuestas_3d")
    .select("id, video_global_url, frame_centro_ms, link_token, link_activo")
    .eq("id", propuestaId)
    .eq("producto_id", (await params).productoId)
    .maybeSingle()

  if (propError || !propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  // Para activar el link se requiere video global y frame centro
  if (activo && (!propuesta.video_global_url || propuesta.frame_centro_ms === null)) {
    return NextResponse.json({ error: "Para activar el link requiere video global y frame centro" }, { status: 422 })
  }

  let link_token: string | null
  if (activo) {
    link_token = propuesta.link_token ?? randomBytes(32).toString("hex")
  } else {
    link_token = null
  }

  const { data, error } = await access.supabase
    .from("propuestas_3d")
    .update({ link_activo: activo, link_token })
    .eq("id", propuestaId)
    .eq("producto_id", (await params).productoId)
    .select()
    .single()

  if (error) {
    console.error("[link-privado]", sanitizeError(error))
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }
    return NextResponse.json({ error: "Error al cambiar link privado" }, { status: 500 })
  }

  return NextResponse.json({ propuesta: data as Propuesta3D })
}