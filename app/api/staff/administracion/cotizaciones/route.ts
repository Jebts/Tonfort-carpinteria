import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sanitizeError } from "@/lib/errors"
import { requireRol } from "@/lib/staff-auth"
import { getServiceSupabase } from "@/lib/supabase/server"
import type { CotizacionConProyecto } from "@/lib/supabase/types"

const createCotizacionSchema = z.object({
  proyecto_id: z.string().uuid("Proyecto inválido"),
  cliente_id: z.string().uuid("Cliente inválido"),
})

const cotizacionSelect = `
  *,
  proyectos!inner(
    id,
    titulo,
    slug,
    clientes!inner(
      id,
      nombre,
      email
    )
  )
`

async function listarCotizaciones() {
  const supabase = getServiceSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(cotizacionSelect)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as CotizacionConProyecto[]
}

export async function GET(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  try {
    const cotizaciones = await listarCotizaciones()
    return NextResponse.json({ cotizaciones })
  } catch (error) {
    console.error("[GET cotizaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener cotizaciones" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = createCotizacionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { proyecto_id: proyectoId, cliente_id: clienteId } = parsed.data

  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 32)
  const { data, error } = await supabase
    .from("cotizaciones")
    .insert({
      proyecto_id: proyectoId,
      cliente_id: clienteId,
      token,
      estado: "creada",
    })
    .select(cotizacionSelect)
    .single()

  if (error) {
    console.error("[POST cotizaciones]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear cotización" }, { status: 500 })
  }

  return NextResponse.json({ cotizacion: data as CotizacionConProyecto }, { status: 201 })
}
