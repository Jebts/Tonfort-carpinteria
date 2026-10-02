import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"

const productoUpdateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  orden: z.number().int().min(0).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> },
) {
  const { id: projectId, productoId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const { data: producto, error } = await access.supabase
    .from("productos")
    .select("*")
    .eq("id", productoId)
    .eq("proyecto_id", projectId)
    .maybeSingle()

  if (error) {
    console.error("[GET producto]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 })
  }

  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ producto })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> },
) {
  const { id: projectId, productoId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = productoUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.titulo !== undefined) update.titulo = parsed.data.titulo
  if (parsed.data.descripcion !== undefined) update.descripcion = parsed.data.descripcion
  if (parsed.data.orden !== undefined) update.orden = parsed.data.orden

  const { data, error } = await access.supabase
    .from("productos")
    .update(update)
    .eq("id", productoId)
    .eq("proyecto_id", projectId)
    .select()
    .single()

  if (error) {
    console.error("[PUT producto]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 })
  }

  return NextResponse.json({ producto: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> },
) {
  const { id: projectId, productoId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const { error } = await access.supabase
    .from("productos")
    .delete()
    .eq("id", productoId)
    .eq("proyecto_id", projectId)

  if (error) {
    console.error("[DELETE producto]", sanitizeError(error))
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
