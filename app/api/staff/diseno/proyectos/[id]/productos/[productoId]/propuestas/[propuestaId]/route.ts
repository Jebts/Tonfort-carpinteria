import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"
import type { EstadoPropuesta3D, Propuesta3D } from "@/lib/supabase/types"

const estadoSchema = z.object({
  estado: z.enum(["borrador", "lista", "enviada"]),
})

const linkSchema = z.object({
  link_activo: z.boolean(),
})

const portafolioSchema = z.object({
  publicada_portafolio: z.boolean(),
})

function texto(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null
}

function validarTransicionEstado(
  desde: EstadoPropuesta3D,
  hacia: EstadoPropuesta3D,
  rol: "admin" | "asesor" | "disenador",
): { ok: boolean; error?: string } {
  if (desde === hacia) return { ok: true }

  if (rol === "admin") return { ok: true }

  if (rol === "disenador") {
    if (desde === "borrador" && hacia === "lista") return { ok: true }
    return { ok: false, error: "Diseñador solo puede pasar borrador → lista" }
  }

  return { ok: false, error: "No autorizado para cambiar estado" }
}

async function obtenerPropuesta(access: { supabase: import("@supabase/supabase-js").SupabaseClient }, productId: string, propuestaId: string) {
  const { data, error } = await access.supabase
    .from("propuestas_3d")
    .select("*")
    .eq("id", propuestaId)
    .eq("producto_id", productId)
    .maybeSingle()

  if (error) return null
  return data as Propuesta3D | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const { data: propuesta, error } = await access.supabase
    .from("propuestas_3d")
    .select("*")
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .maybeSingle()

  if (error) {
    console.error("[GET propuesta]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener propuesta" }, { status: 500 })
  }

  if (!propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ propuesta })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 })
  }

  const b = body as Record<string, unknown>

  const titulo = texto(b.titulo) ?? texto(b.nombre)
  const descripcion = texto(b.descripcion) ?? texto(b.descripcion_comercial)
  const videoGlobalUrl = b.video_global_url === null ? null : typeof b.video_global_url === "string" ? b.video_global_url : undefined
  const frameCentroMs = b.frame_centro_ms === null ? null : typeof b.frame_centro_ms === "number" ? b.frame_centro_ms : undefined

  if (titulo !== null && titulo !== undefined && titulo.trim() === "") {
    return NextResponse.json({ error: "El título no puede estar vacío" }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (titulo !== null && titulo !== undefined) update.titulo = titulo.trim()
  if (descripcion !== undefined) update.descripcion = descripcion
  if (videoGlobalUrl !== undefined) {
    update.video_global_url = videoGlobalUrl
    if (videoGlobalUrl === null) {
      update.estado = "borrador"
      update.link_activo = false
      update.publicada_portafolio = false
    }
  }
  if (frameCentroMs !== undefined) update.frame_centro_ms = frameCentroMs

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 422 })
  }

  const { data, error } = await access.supabase
    .from("propuestas_3d")
    .update(update)
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .select()
    .single()

  if (error) {
    console.error("[PUT propuesta]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar propuesta" }, { status: 500 })
  }

  return NextResponse.json({ propuesta: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 })
  }

  const b = body as Record<string, unknown>

  // Estado transition
  if ("estado" in b) {
    const estadoResult = estadoSchema.safeParse(body)
    if (!estadoResult.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 422 })
    }

    const nuevoEstado = estadoResult.data.estado

    const propuesta = await obtenerPropuesta(access, productoId, propuestaId)
    if (!propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }

    const transicion = validarTransicionEstado(propuesta.estado, nuevoEstado, access.session.rol)
    if (!transicion.ok) {
      return NextResponse.json({ error: transicion.error }, { status: 403 })
    }

    // Validar requisitos para pasar a lista
    if (nuevoEstado === "lista") {
      if (!propuesta.video_global_url || propuesta.frame_centro_ms === null) {
        return NextResponse.json({ error: "Para pasar a lista requiere video global y frame centro" }, { status: 422 })
      }
    }

    // Admin puede pasar a enviada desde lista (o cualquier estado)
    const { data, error } = await access.supabase
      .from("propuestas_3d")
      .update({ estado: nuevoEstado })
      .eq("id", propuestaId)
      .eq("producto_id", productoId)
      .select()
      .single()

    if (error) {
      console.error("[PATCH propuesta estado]", sanitizeError(error))
      return NextResponse.json({ error: "Error al cambiar estado" }, { status: 500 })
    }

    return NextResponse.json({ propuesta: data })
  }

  // Link privado toggle
  if ("link_activo" in b) {
    const linkResult = linkSchema.safeParse(body)
    if (!linkResult.success) {
      return NextResponse.json({ error: "Datos inválidos para link" }, { status: 422 })
    }

    const propuesta = await obtenerPropuesta(access, productoId, propuestaId)
    if (!propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }

    // Admin puede activar link. Diseñador solo si tiene video global y frame centro.
    if (access.session.rol === "disenador") {
      if (!propuesta.video_global_url || propuesta.frame_centro_ms === null) {
        return NextResponse.json({ error: "Para activar el link requiere video global y frame centro" }, { status: 422 })
      }
    }

    let link_token: string | null
    if (linkResult.data.link_activo) {
      link_token = propuesta.link_token ?? null
      if (!link_token) {
        // Generar token único no predecible
        const { randomBytes } = await import("crypto")
        link_token = randomBytes(32).toString("hex")
      }
    } else {
      link_token = null
    }

    const { data, error } = await access.supabase
      .from("propuestas_3d")
      .update({ link_activo: linkResult.data.link_activo, link_token })
      .eq("id", propuestaId)
      .eq("producto_id", productoId)
      .select()
      .single()

    if (error) {
      console.error("[PATCH propuesta link]", sanitizeError(error))
      return NextResponse.json({ error: "Error al actualizar link" }, { status: 500 })
    }

    return NextResponse.json({ propuesta: data })
  }

  // Publicación portafolio
  if ("publicada_portafolio" in b) {
    const portafolioResult = portafolioSchema.safeParse(body)
    if (!portafolioResult.success) {
      return NextResponse.json({ error: "Datos inválidos para portafolio" }, { status: 422 })
    }

    const propuesta = await obtenerPropuesta(access, productoId, propuestaId)
    if (!propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
    }

    // Solo admin puede publicar
    if (access.session.rol !== "admin") {
      return NextResponse.json({ error: "Solo admin puede publicar en portafolio" }, { status: 403 })
    }

    // Validar: publicar requiere estado enviada
    if (portafolioResult.data.publicada_portafolio) {
      if (propuesta.estado !== "enviada") {
        return NextResponse.json({ error: "Para publicar requiere estado enviada" }, { status: 422 })
      }
    }

    const { data, error } = await access.supabase
      .from("propuestas_3d")
      .update({ publicada_portafolio: portafolioResult.data.publicada_portafolio })
      .eq("id", propuestaId)
      .eq("producto_id", productoId)
      .select()
      .single()

    if (error) {
      console.error("[PATCH propuesta portafolio]", sanitizeError(error))
      return NextResponse.json({ error: "Error al actualizar portafolio" }, { status: 500 })
    }

    return NextResponse.json({ propuesta: data })
  }

  return NextResponse.json({ error: "Operación no reconocida" }, { status: 422 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Limpiar video_global_url del storage si existe
  const { data: propuesta } = await access.supabase
    .from("propuestas_3d")
    .select("video_global_url")
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .maybeSingle()

  if (propuesta?.video_global_url) {
    const { deleteVisoresVideo } = await import("@/lib/storage")
    await deleteVisoresVideo(access.supabase, propuesta.video_global_url)
  }

  const { error } = await access.supabase
    .from("propuestas_3d")
    .delete()
    .eq("id", propuestaId)
    .eq("producto_id", productoId)

  if (error) {
    console.error("[DELETE propuesta]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar propuesta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
