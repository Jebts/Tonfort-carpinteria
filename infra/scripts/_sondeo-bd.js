// Sondeo de solo lectura del estado actual de la BD (temporal).
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
  const { data: proys } = await s.from('proyectos').select('id,slug,sede,categoria,orden,publicado,portada_url,titulo')
  const { data: fotos } = await s.from('proyectos_fotos').select('id,proyecto_id,orden,alt,url')
  const porSede = {}
  for (const p of proys ?? []) porSede[p.sede] = (porSede[p.sede] ?? 0) + 1
  console.log('proyectos:', (proys ?? []).length, JSON.stringify(porSede))
  const conf = /\-\d+$/
  console.log('slugs con sufijo numerico:', (proys ?? []).filter((p) => conf.test(p.slug)).map((p) => p.slug))
  console.log('sin portada_url:', (proys ?? []).filter((p) => !p.portada_url).map((p) => p.slug))
  console.log('categoria null:', (proys ?? []).filter((p) => !p.categoria).map((p) => p.slug))
  const bogota = (proys ?? []).filter((p) => p.sede === 'bogota')
  console.log('bogota publicados:', bogota.filter((p) => p.publicado).length, 'de', bogota.length)
  const sm = (proys ?? []).filter((p) => p.sede === 'santa_marta')
  console.log('santa_marta:', sm.map((p) => ({ slug: p.slug, publi: p.publicado })))
  const porProy = {}
  for (const f of fotos ?? []) porProy[f.proyecto_id] = (porProy[f.proyecto_id] ?? 0) + 1
  const bogotaFotos = bogota.reduce((a, p) => a + (porProy[p.id] ?? 0), 0)
  const smFotos = sm.reduce((a, p) => a + (porProy[p.id] ?? 0), 0)
  console.log('fotos por sede: bogota', bogotaFotos, 'santa_marta', smFotos, 'total', (fotos ?? []).length)
  const sinFotos = (proys ?? []).filter((p) => !porProy[p.id])
  console.log('proyectos sin fotos:', sinFotos.map((p) => p.slug))
  const alts = {}
  for (const f of fotos ?? []) { const m = /— vista (\d+)$/.exec(f.alt ?? ''); alts[m ? 'vista' : 'otro'] = (alts[m ? 'vista' : 'otro'] ?? 0) + 1 }
  console.log('alt parseable:', JSON.stringify(alts))
  console.log('primeros alts:', (fotos ?? []).slice(0, 3).map((f) => f.alt))
  const { data: buckets } = await s.storage.listBuckets()
  console.log('buckets:', (buckets ?? []).map((b) => b.name))
}
main().catch((e) => { console.error(e); process.exit(1) })
