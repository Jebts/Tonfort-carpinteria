import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { hashPasswordForEnv } from "@/lib/auth-core"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const usuarioCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["asesor", "disenador"]),
  foto_perfil: z.string().url().nullable().optional(),
  bio_publica: z.string().max(1000).nullable().optional(),
  activo: z.boolean().default(true),
})

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2).max(120).optional(),
  email: z.string().email("Email no válido").optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
  rol: z.enum(["asesor", "disenador"]).optional(),
  foto_perfil: z.string().url().nullable().optional(),
  bio_publica: z.string().max(1000).nullable().optional(),
  activo: z.boolean().optional(),
})

// GET /api/staff/usuarios — Lista todos (admin)
export async function GET(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("creado_en", { ascending: false })

  if (error) {
    console.error("[GET /api/staff/usuarios]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }

  return NextResponse.json({ usuarios: data ?? [] })
}

// POST /api/staff/usuarios — Crea usuario (admin)
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

  const parsed = usuarioCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { nombre, email, password, rol, foto_perfil, bio_publica, activo } = parsed.data

  // Validaciones de negocio
  if (rol === "disenador" && activo && (!foto_perfil || !bio_publica)) {
    return NextResponse.json(
      { error: "Los diseñadores activos requieren foto_perfil y bio_publica" },
      { status: 422 },
    )
  }

  // Verificar email único
  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
  }

  const passwordHash = await hashPasswordForEnv(password)

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nombre,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      rol,
      foto_perfil: foto_perfil ?? null,
      bio_publica: bio_publica ?? null,
      activo,
    })
    .select()
    .single()

  if (error) {
    console.error("[POST /api/staff/usuarios]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }

  return NextResponse.json({ usuario: data }, { status: 201 })
}