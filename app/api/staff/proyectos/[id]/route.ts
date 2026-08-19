import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { proyectoSchema } from "@/lib/validators"
import type { Proyecto } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/proyectos/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { data, error } = await supabase.from("proyectos").select("*").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ proyecto: data as Proyecto })
}

// PUT /api/staff/proyectos/[id] → actualiza
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = proyectoSchema.partial().safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const d = parse.data
  const update: Record<string, unknown> = { ...d }
  if (d.galeria) update.galeria = d.galeria as never

  const { data, error } = await supabase
    .from("proyectos")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ proyecto: data as Proyecto })
}

// DELETE /api/staff/proyectos/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { error } = await supabase.from("proyectos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ ok: true })
}
