import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"

const animacionCreateSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  video_movimiento_url: z.string().default(""),
  video_accion_url: z.string().nullable().optional(),
  velocidad_normal: z.number().positive().default(1),
  velocidad_inversa: z.number().positive().default(2),
  orden: z.number().int().min(0).optional(),
})

const animacionUpdateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  video_movimiento_url: z.string().min(1).optional(),
  video_accion_url: z.string().nullable().optional(),
  velocidad_normal: z.number().positive().optional(),
  velocidad_inversa: z.number().positive().optional(),
  orden: z.number().int().min(0).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Verificar que la propuesta pertenece al producto
  const { data: propuesta, error: propError } = await access.supabase
    .from("propuestas_3d")
    .select("id")
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .maybeSingle()

  if (propError || !propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  const { data: animaciones, error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .select("*")
    .eq("propuesta_id", propuestaId)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET animaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener animaciones" }, { status: 500 })
  }

  return NextResponse.json({ animaciones: animaciones ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const { id: projectId, productoId, propuestaId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Verificar que la propuesta pertenece al producto
  const { data: propuesta, error: propError } = await access.supabase
    .from("propuestas_3d")
    .select("id")
    .eq("id", propuestaId)
    .eq("producto_id", productoId)
    .maybeSingle()

  if (propError || !propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = animacionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { data, error } = await access.supabase
    .from("propuestas_3d_animaciones")
    .insert({
      propuesta_id: propuestaId,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion ?? null,
      video_movimiento_url: parsed.data.video_movimiento_url,
      video_accion_url: parsed.data.video_accion_url ?? null,
      velocidad_normal: parsed.data.velocidad_normal,
      velocidad_inversa: parsed.data.velocidad_inversa,
      orden: parsed.data.orden ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("[POST animaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear animación" }, { status: 500 })
  }

  return NextResponse.json({ animacion: data }, { status: 201 })
}
