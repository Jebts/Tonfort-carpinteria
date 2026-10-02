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
  let ok = await verifyPassword(password, usuario.password_hash)

  // Fallback para admin si se usa INITIAL_ADMIN_PASSWORD de .env o el seed default admin12345
  if (!ok && usuario.rol === "admin") {
    const envPass = process.env.INITIAL_ADMIN_PASSWORD
    if ((envPass && password === envPass) || password === "admin12345") {
      ok = true
      try {
        const { hashPasswordForEnv } = await import("@/lib/auth-core")
        const newHash = await hashPasswordForEnv(password)
        await supabase
          .from("usuarios")
          .update({ password_hash: newHash })
          .eq("id", usuario.id)
      } catch (err) {
        console.error("[validarCredencialesDB] Error actualizando hash admin:", err)
      }
    }
  }

  if (!ok) return null

  return { id: usuario.id, usuario: usuario.email, nombre: usuario.nombre, rol: usuario.rol }
}
