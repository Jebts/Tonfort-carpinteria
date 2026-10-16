import { type Sesion, type UsuarioDB, verifyPassword } from "@/lib/auth-core"

export async function validarCredencialesDB(identificador: string, password: string): Promise<Sesion | null> {
  const { getServiceSupabase } = await import("@/lib/supabase/server")
  const supabase = getServiceSupabase()
  if (!supabase) return null

  const raw = identificador.toLowerCase().trim()
  const candidateEmails = raw.includes("@")
    ? [raw]
    : [raw, `${raw}@tonfort.local`]

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .in("email", candidateEmails)
    .eq("activo", true)
    .maybeSingle()

  if (error || !data) return null

  const usuario = data as UsuarioDB
  const ok = await verifyPassword(password, usuario.password_hash)

  if (!ok) return null

  return { id: usuario.id, usuario: usuario.email, nombre: usuario.nombre, rol: usuario.rol }
}
