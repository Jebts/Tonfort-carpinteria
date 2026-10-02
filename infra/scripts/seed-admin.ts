import "dotenv/config"
import { createClient } from "@supabase/supabase-js"
import { hashPasswordForEnv } from "@/lib/auth-core"
import { sanitizeError } from "@/lib/errors"

function getServiceSupabaseDirect() {
  const url = process.env.CARPINTERIA_SUPABASE_URL
  const key = process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function seedAdmin() {
  const password = process.env.INITIAL_ADMIN_PASSWORD
  if (!password) {
    console.error("ERROR: INITIAL_ADMIN_PASSWORD env var is required")
    process.exit(1)
  }

  if (password.length < 8) {
    console.error("ERROR: INITIAL_ADMIN_PASSWORD must be at least 8 characters")
    process.exit(1)
  }

  const supabase = getServiceSupabaseDirect()
  if (!supabase) {
    console.error("ERROR: Supabase not configured (CARPINTERIA_SUPABASE_URL and CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY required)")
    process.exit(1)
  }

  const email = "admin@tonfort.local"
  const nombre = "Administrador"

  const passwordHash = await hashPasswordForEnv(password)

  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    console.log("Admin user already exists, updating password...")
    const { error } = await supabase
      .from("usuarios")
      .update({ password_hash: passwordHash, actualizado_en: new Date().toISOString() })
      .eq("email", email)
    if (error) {
      console.error("Error updating admin:", sanitizeError(error))
      process.exit(1)
    }
    console.log("Admin password updated successfully")
    return
  }

  const { error } = await supabase
    .from("usuarios")
    .insert({
      email,
      password_hash: passwordHash,
      nombre,
      rol: "admin",
      activo: true,
    })

  if (error) {
    console.error("Error creating admin:", sanitizeError(error))
    process.exit(1)
  }

  console.log("Admin user created successfully")
  console.log(`Email: ${email}`)
  console.log("Password: (from INITIAL_ADMIN_PASSWORD env var)")
}

seedAdmin()