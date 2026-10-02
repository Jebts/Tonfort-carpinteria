import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"

const propuestaCreateSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
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

  const { data: propuestas, error } = await access.supabase
    .from("propuestas_3d")
    .select("*")
    .eq("producto_id", productoId)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET propuestas]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener propuestas" }, { status: 500 })
  }

  return NextResponse.json({ propuestas: propuestas ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productoId: string }> },
) {
  const { id: projectId, productoId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  // Verificar que el producto pertenece al proyecto
  const { data: producto, error: productoError } = await access.supabase
    .from("productos")
    .select("id")
    .eq("id", productoId)
    .eq("proyecto_id", projectId)
    .maybeSingle()

  if (productoError || !producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = propuestaCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { titulo, descripcion, orden } = parsed.data

  const { data, error } = await access.supabase
    .from("propuestas_3d")
    .insert({
      producto_id: productoId,
      titulo,
      descripcion: descripcion ?? null,
      orden: orden ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("[POST propuestas]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear propuesta" }, { status: 500 })
  }

  return NextResponse.json({ propuesta: data }, { status: 201 })
}
