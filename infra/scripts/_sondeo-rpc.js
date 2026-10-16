// Sondeo temporal: ¿existe el RPC exec_sql?
const fs = require('fs')
const path = require('path')
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!(k in process.env)) process.env[k] = v
  }
}
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.CARPINTERIA_SUPABASE_URL, process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
async function main() {
  const r = await s.rpc('exec_sql', { sql: 'SELECT 1 AS ok' })
  console.log('exec_sql:', JSON.stringify(r))
  for (const t of ['proyectos_visores', 'proyectos_fotos', 'visores_landing', 'visores_landing_animaciones', 'cotizaciones', 'citas']) {
    const q = await s.from(t).select('id').limit(1)
    console.log(t, q.error ? `ERROR ${q.error.code} ${q.error.message}` : 'ok')
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
