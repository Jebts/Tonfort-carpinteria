import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { clienteSchema } from "@/lib/validators"
import type { Cliente } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/clientes/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ cliente: data as Cliente })
}

// PUT /api/staff/clientes/[id] → actualiza
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

  const parse = clienteSchema.partial().safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("clientes")
    .update({
      ...parse.data,
      info_personal: (parse.data.info_personal ?? {}) as never,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ cliente: data as Cliente })
}

// DELETE /api/staff/clientes/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req)
  if (denied) return denied

  const { id } = await params
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  const { error: errorCitas } = await supabase.from("citas").delete().eq("cliente_id", id)
  if (errorCitas) return NextResponse.json({ error: sanitizeError(errorCitas) }, { status: 500 })

  const { error } = await supabase.from("clientes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ ok: true })
}
