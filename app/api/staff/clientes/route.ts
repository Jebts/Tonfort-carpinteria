import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/staff-auth"
import { clienteSchema } from "@/lib/validators"
import type { Cliente } from "@/lib/supabase/types"
import { sanitizeError } from "@/lib/errors"

// GET /api/staff/clientes  → lista completa
export async function GET(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ clientes: [] })

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("creado_en", { ascending: false })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ clientes: (data ?? []) as Cliente[] })
}

// POST /api/staff/clientes → crea cliente
export async function POST(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = clienteSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parse.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      ...parse.data,
      info_personal: (parse.data.info_personal ?? {}) as never,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json({ cliente: data as Cliente }, { status: 201 })
}
