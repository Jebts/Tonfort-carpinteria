import { NextRequest, NextResponse } from "next/server"
import { sanitizeError } from "@/lib/errors"
import { getDisenoProjectAccess } from "@/lib/diseno-access"
import { z } from "zod"

const productoCreateSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  const { data: productos, error } = await access.supabase
    .from("productos")
    .select("*")
    .eq("proyecto_id", projectId)
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET productos]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
  }

  return NextResponse.json({ productos: productos ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const access = await getDisenoProjectAccess(req, projectId)
  if (!access.ok) return access.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = productoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { titulo, descripcion } = parsed.data

  const { data, error } = await access.supabase
    .from("productos")
    .insert({
      proyecto_id: projectId,
      titulo,
      descripcion: descripcion ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("[POST productos]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 })
  }

  return NextResponse.json({ producto: data }, { status: 201 })
}
