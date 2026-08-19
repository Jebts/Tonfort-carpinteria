import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Cliente server con service_role. Usado por los Route Handlers para lectura/
// escritura sin restricciones de RLS. NUNCA exponer al browser.
//
// Si las variables no están definidas (p.ej. build sin env), devuelve null para
// que los consumidores degraden con elegancia (lista vacía) en vez de crashear.

let cachedService: SupabaseClient | null = null
let cachedAnon: SupabaseClient | null = null

function url() {
  return process.env.CARPINTERIA_SUPABASE_URL
}
function serviceKey() {
  return process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY
}
function anonKey() {
  return process.env.CARPINTERIA_SUPABASE_ANON_KEY
}

export function getServiceSupabase(): SupabaseClient | null {
  if (!url() || !serviceKey()) return null
  if (!cachedService) {
    cachedService = createClient(url()!, serviceKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cachedService
}

// Solo SELECT a proyectos públicos (policy anon). No se usa para escrituras.
export function getAnonSupabase(): SupabaseClient | null {
  if (!url() || !anonKey()) return null
  if (!cachedAnon) {
    cachedAnon = createClient(url()!, anonKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cachedAnon
}

export const SUPABASE_CONFIGURED = Boolean(url() && serviceKey())

// Mensaje claro cuando el backend no está configurado: ayuda a depurar el 500.
export const BACKEND_NO_CONFIGURADO =
  "Backend no configurado: faltan CARPINTERIA_SUPABASE_URL y CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY en el .env del staff"
