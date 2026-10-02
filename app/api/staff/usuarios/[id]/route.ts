import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol, getSesion } from "@/lib/staff-auth"
import { hashPasswordForEnv } from "@/lib/auth-core"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2).max(120).optional(),
  email: z.string().email("Email no válido").optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
  rol: z.enum(["asesor", "disenador"]).optional(),
  foto_perfil: z.string().url().nullable().optional(),
  bio_publica: z.string().max(1000).nullable().optional(),
  activo: z.boolean().optional(),
})

// GET /api/staff/usuarios/[id] — Detalle (admin)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[GET /api/staff/usuarios/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ usuario: data })
}

// PUT /api/staff/usuarios/[id] — Edita (admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const sesion = getSesion(req)
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  // No permitir editar propio usuario para cambiar rol o desactivarse
  const { data: targetUser } = await supabase
    .from("usuarios")
    .select("email, rol, activo, foto_perfil, bio_publica")
    .eq("id", id)
    .maybeSingle()

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = usuarioUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const updates = parsed.data

  // No permitir desactivar propio usuario
  if (updates.activo === false && targetUser.email === sesion.usuario) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 403 })
  }

  // Validar que quede al menos un admin activo
  if (updates.activo === false && targetUser.rol === "admin") {
    const { data: adminsActivos } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin")
      .eq("activo", true)

    if ((adminsActivos?.length ?? 0) <= 1) {
      return NextResponse.json({ error: "Debe haber al menos un administrador activo" }, { status: 403 })
    }
  }

  // Validaciones de negocio para diseñadores
  const targetRol = updates.rol ?? targetUser.rol
  if (targetRol === "disenador" && updates.activo !== false) {
    const foto = updates.foto_perfil ?? targetUser.foto_perfil
    const bio = updates.bio_publica ?? targetUser.bio_publica
    if (!foto || !bio) {
      return NextResponse.json(
        { error: "Los diseñadores activos requieren foto_perfil y bio_publica" },
        { status: 422 },
      )
    }
  }

  // Verificar email único si se cambia
  if (updates.email && updates.email.toLowerCase().trim() !== targetUser.email) {
    const { data: existing } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", updates.email.toLowerCase().trim())
      .neq("id", id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
    }
  }

  // Preparar datos de actualización
  const updateData: Record<string, unknown> = { ...updates }
  if (updates.email) {
    updateData.email = updates.email.toLowerCase().trim()
  }
  if (updates.password) {
    updateData.password_hash = await hashPasswordForEnv(updates.password)
    delete updateData.password
  }
  updateData.actualizado_en = new Date().toISOString()

  const { data, error } = await supabase
    .from("usuarios")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[PUT /api/staff/usuarios/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }

  return NextResponse.json({ usuario: data })
}

// DELETE /api/staff/usuarios/[id] — Elimina/desactiva (admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

  const sesion = getSesion(req)
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  const { id } = await params

  const { data: targetUser } = await supabase
    .from("usuarios")
    .select("email, rol, activo")
    .eq("id", id)
    .maybeSingle()

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  // No permitir eliminar propio usuario
  if (targetUser.email === sesion.usuario) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 403 })
  }

  // No permitir eliminar último admin
  if (targetUser.rol === "admin" && targetUser.activo) {
    const { data: adminsActivos } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin")
      .eq("activo", true)

    if ((adminsActivos?.length ?? 0) <= 1) {
      return NextResponse.json({ error: "No se puede eliminar el último administrador activo" }, { status: 403 })
    }
  }

  // Soft delete: activo = false
  const { error } = await supabase
    .from("usuarios")
    .update({ activo: false, actualizado_en: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[DELETE /api/staff/usuarios/[id]]", sanitizeError(error))
    return NextResponse.json({ error: "Error al desactivar usuario" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}