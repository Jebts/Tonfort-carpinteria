// aplica-migracion.mjs — aplica las migraciones de `supabase/migrations/` a la
// BD de Supabase.
//
// El repo no tenía forma de aplicar SQL: `service_role` solo llega por PostgREST
// (que no ejecuta DDL) y no hay connection string de Postgres en `.env`. Esa
// ausencia ya dejado migraciones escritas sin aplicar (la del carrusel de
// visores rompía el alta con un 500). Este script usa la Management API de
// Supabase, que sí ejecuta SQL arbitrario.
//
// Uso:
//   npm run db:migrate                 # aplica SOLO las que falten (por defecto)
//   npm run db:migrate -- --todas      # aplica las 8 (20260919000000 borra 15 tablas legacy)
//   npm run db:migrate -- --lista      # muestra cuáles faltan y sale
//
// Por defecto va a lo seguro: `init_clean_schema.sql` hace DROP de tablas, así
// que reejecutarla no tiene sentido. `--todas` existe para una BD desde cero.
//
// Requiere SUPABASE_ACCESS_TOKEN (token personal, no la service_role):
//   https://supabase.com/dashboard/account/tokens
// Se lee de `.env` o del entorno. NO se commitea.

const fs = require('fs')
const path = require('path')

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

const SUPABASE_URL = process.env.CARPINTERIA_SUPABASE_URL
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase', 'migrations')
const API = 'https://api.supabase.com/v1'

function projectRef() {
  if (!SUPABASE_URL) {
    console.error('Falta CARPINTERIA_SUPABASE_URL en .env')
    process.exit(1)
  }
  const host = new URL(SUPABASE_URL).hostname
  const ref = host.split('.')[0]
  if (!ref || ref === 'localhost') {
    console.error(`No pude sacar el project ref de ${SUPABASE_URL}`)
    process.exit(1)
  }
  return ref
}

// Version de una migración: los primeros 14 dígitos del nombre
// (`20260925000000_visores_carrusel.sql` -> `20260925000000`).
function versionDe(archivo) {
  return archivo.replace(/\D/g, '').slice(0, 14)
}

function listarMigraciones() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

// Las migraciones usan IF [NOT] EXISTS / DROP ... IF EXISTS, así que se pueden
// volver a ejecutar sin romper nada. `--pendientes` solo consulta cuáles
// aparecen registradas como aplicadas por la Management API.
async function aplicadas(ref) {
  const res = await fetch(`${API}/projects/${ref}/migrations`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  const versiones = new Set((Array.isArray(data) ? data : []).map((m) => String(m.version)))
  return versiones
}

async function ejecutar(ref, nombre, sql) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const texto = await res.text()
  let detalle = texto
  try {
    const json = JSON.parse(texto)
    detalle = json.message || json.error || json.msg || texto
  } catch {
    // la API a veces devuelve texto plano
  }
  return { ok: res.ok, status: res.status, detalle: String(detalle).slice(0, 300) }
}

async function main() {
  const args = process.argv.slice(2)
  const todas = args.includes('--todas')
  const soloListar = args.includes('--lista')
  const ref = projectRef()
  const archivos = listarMigraciones()

  if (archivos.length === 0) {
    console.log('No hay migraciones en supabase/migrations/')
    return
  }

  console.log(`Proyecto: ${ref}  (${SUPABASE_URL})`)
  console.log(`Migraciones encontradas: ${archivos.length}\n`)

  if (!ACCESS_TOKEN) {
    console.error('Falta SUPABASE_ACCESS_TOKEN.\n')
    console.error('La service_role no puede ejecutar DDL, así que hace falta un token personal.')
    console.error('  1. Créalo en https://supabase.com/dashboard/account/tokens')
    console.error('  2. Añade SUPABASE_ACCESS_TOKEN=... a tu .env')
    console.error('  3. Vuelve a correr: npm run db:migrate\n')
    console.error(`O aplica el SQL a mano en:\n  https://supabase.com/dashboard/project/${ref}/sql/new`)
    process.exit(1)
  }

  const hechas = await aplicadas(ref)
  if (!hechas && !soloListar) {
    console.error('No pude leer qué migraciones están aplicadas (¿el token es válido?).')
    console.error('Sin ese dato no sé cuáles faltan, así que no aplico nada a ciegas.')
    console.error('  · revisa SUPABASE_ACCESS_TOKEN, o')
    console.error('  · fuerza con: npm run db:migrate -- --todas\n')
    process.exit(1)
  }

  const pendientes = hechas
    ? archivos.filter((f) => !hechas.has(versionDe(f)))
    : archivos

  for (const f of archivos) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
    const falta = pendientes.includes(f)
    const marca = hechas ? (falta ? 'PENDIENTE' : 'aplicada  ') : '?         '
    console.log(`  [${marca}] ${f}`)
    if (soloListar) continue
    // Sin --todas se salta lo que la API da por aplicado, y también cualquier
    // archivo que haga DROP: reejecutarlo no aporta nada y arriesga datos.
    if (!todas && (!hechas || !falta)) {
      console.log(`      → se salta (usa --todas para forzar)\n`)
      continue
    }
    if (!todas && /drop\s+table/i.test(sql)) {
      console.log(`      → se salta: contiene DROP TABLE (usa --todas para forzar)\n`)
      continue
    }
    const r = await ejecutar(ref, f, sql)
    if (r.ok) {
      console.log(`      → OK`)
    } else {
      console.log(`      → ${r.status} ${r.detalle}`)
    }
    console.log('')
  }

  if (soloListar && hechas) {
    console.log(`\nFaltan ${pendientes.length} de ${archivos.length}.`)
  }
  if (!soloListar && !todas) {
    console.log('Solo se aplicaron las pendientes. `--todas` reejecuta todas (una hace DROP TABLE).')
  }
}

main().catch((e) => {
  console.error('Error:', e && e.message ? e.message : e)
  process.exit(1)
})
