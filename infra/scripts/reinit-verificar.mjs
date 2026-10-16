#!/usr/bin/env node
/**
 * Verificación ESTRICTA del reinit (`npm run db:reinit`).
 *
 * A diferencia de `portafolio-verificar.mjs`, que solo informa, este aserta y
 * sale con código 1 si algo no cuadra. Todos los valores esperados se calculan
 * desde el manifest y desde el seed demo: no hay ningún número escrito a palo,
 * así que si el manifest cambia, la verificación cambia con él.
 *
 * Uso:
 *   node infra/scripts/reinit-verificar.mjs [--origen URL] [--modo-portada unica|duplicada]
 *
 * Ojo con el caché: `GET /api/public/portafolio/proyectos` declara
 * `revalidate = 300`, así que apuntado a un servidor de producción puede
 * devolver datos de hace 5 minutos. Contra `next dev` (lo que arranca
 * `reinit.mjs`) no hay caché.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  PORTAFOLIO_BASE,
  conteoEsperado,
  fotosDe,
  leerManifiesto,
  MODOS_PORTADA,
} from './portafolio-paths.mjs'
import { cargarEntorno, supabaseService } from './reinit-lib.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')
const MODO_PORTADA = opt('modo-portada', 'unica')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

if (!MODOS_PORTADA.includes(MODO_PORTADA)) {
  console.error(`--modo-portada debe ser uno de: ${MODOS_PORTADA.join(' | ')}`)
  process.exit(1)
}

const resultados = []
function comprobar(nombre, esperado, real, detalle = '') {
  const ok = JSON.stringify(esperado) === JSON.stringify(real)
  resultados.push({ nombre, ok, esperado, real, detalle })
  const linea = `${ok ? 'OK   ' : 'FALLO'} ${nombre}: esperado ${JSON.stringify(esperado)}, real ${JSON.stringify(real)}`
  console.log(detalle && !ok ? `${linea}\n       ${detalle}` : linea)
}

cargarEntorno()
const manifest = leerManifiesto(PORTAFOLIO_BASE)
const usuario = process.env.INITIAL_ADMIN_USUARIO ?? 'admin@tonfort.local'
const password = process.env.INITIAL_ADMIN_PASSWORD

if (!password) {
  console.error('Falta INITIAL_ADMIN_PASSWORD en .env')
  process.exit(1)
}

console.log('=== Verificación estricta del reinit ===')
console.log(`Set base: ${PORTAFOLIO_BASE} (${manifest.length} proyectos)`)
console.log(`Origen: ${ORIGEN} · modo de portada: ${MODO_PORTADA}`)

// --- Sesión de staff (para contar lo que hay en el panel) -------------------
const login = await fetch(`${ORIGEN}/api/staff/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario, password }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
if (login.status !== 200 || !cookie) {
  console.error(`Login fallido (${login.status})`)
  process.exit(1)
}

async function api(ruta) {
  const res = await fetch(`${ORIGEN}${ruta}`, { headers: { cookie } })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

const panel = await api('/api/staff/administracion/portafolio/proyectos')
const todos = panel.json?.proyectos ?? []
const bogotaPanel = todos.filter((p) => p.sede === 'bogota')
const santaPanel = todos.filter((p) => p.sede === 'santa_marta')

// --- Lo que ve el público --------------------------------------------------
const publicos = await fetch(`${ORIGEN}/api/public/portafolio/proyectos`).then((r) => r.json())
const bogota = (publicos.proyectos ?? []).filter((p) => p.sede === 'bogota')
const santa = (publicos.proyectos ?? []).filter((p) => p.sede === 'santa_marta')

console.log(`\nPanel: ${todos.length} proyectos · público: ${(publicos.proyectos ?? []).length}`)

// --- Conteos ---------------------------------------------------------------
comprobar('proyectos de Bogotá publicados', manifest.length, bogota.length)
comprobar('proyectos de Bogotá en el panel', manifest.length, bogotaPanel.length)
comprobar('proyectos de Santa Marta (seed demo)', 6, santaPanel.length)
comprobar('proyectos de Santa Marta publicados (seed demo)', 4, santaPanel.filter((p) => p.publicado).length)
comprobar('proyectos de Santa Marta visibles en público', 4, santa.length)

// --- Fotos en la BD (service role, solo lectura) ---------------------------
const servicio = supabaseService()
if (!servicio) {
  console.error('Faltan CARPINTERIA_SUPABASE_URL / CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const { count: totalFotos, error: errorFotos } = await servicio
  .from('proyectos_fotos')
  .select('id', { count: 'exact' })
  .limit(0)
const fotosEsperadas = conteoEsperado(manifest, MODO_PORTADA, PORTAFOLIO_BASE)
comprobar(
  `filas en proyectos_fotos (modo ${MODO_PORTADA})`,
  fotosEsperadas,
  errorFotos ? `error: ${errorFotos.message}` : totalFotos,
)

// --- Portadas, slugs y cobertura ------------------------------------------
const sinPortada = bogota.filter((p) => !p.portada_url)
comprobar('proyectos sin portada_url (caerían en FALLBACK_PORTADA)', 0, sinPortada.length, sinPortada.slice(0, 10).map((p) => p.slug).join(', '))

const slugsManifest = new Set(manifest.map((m) => m.slug))
const repetidos = new Set()
const vistos = new Set()
for (const p of todos) {
  if (vistos.has(p.slug)) repetidos.add(p.slug)
  vistos.add(p.slug)
}
comprobar('slugs duplicados en el panel', 0, repetidos.size, [...repetidos].join(', '))

// Sufijo de dedup de la API (`-1`, `-2`, …): un slug de Bogotá que no está en
// el manifest es una línea duplicada creada por una colisión.
const conSufijo = bogotaPanel.filter((p) => !slugsManifest.has(p.slug))
comprobar('slugs de Bogotá que no están en el manifest', 0, conSufijo.length, conSufijo.slice(0, 10).map((p) => p.slug).join(', '))

const faltan = manifest.filter((m) => !vistos.has(m.slug))
comprobar('proyectos del manifest ausentes del panel', 0, faltan.length, faltan.slice(0, 10).map((m) => `${m.orden} ${m.slug}`).join(', '))

// --- Reparto por categoría (derivado del manifest) -------------------------
const esperadoCategorias = new Map()
for (const m of manifest) esperadoCategorias.set(m.categoria, (esperadoCategorias.get(m.categoria) ?? 0) + 1)
const realCategorias = new Map()
for (const p of bogota) realCategorias.set(p.categoria ?? 'sin-categoria', (realCategorias.get(p.categoria ?? 'sin-categoria') ?? 0) + 1)
const categoriasOk =
  esperadoCategorias.size === realCategorias.size &&
  [...esperadoCategorias].every(([c, n]) => realCategorias.get(c) === n)
comprobar(
  'reparto por categoría',
  Object.fromEntries([...esperadoCategorias].sort()),
  Object.fromEntries([...realCategorias].sort()),
  categoriasOk ? '' : `esperado ${JSON.stringify(Object.fromEntries(esperadoCategorias))}`,
)

// --- Galería concreta de cada proyecto ------------------------------------
// Se compara por `alt`, que el cargador escribe determinista
// (`<titulo> — vista <i>`). Así se detecta una galería incompleta aunque el
// total de filos cuadre.
const galeriasMal = []
for (const m of manifest) {
  const esperadas = fotosDe(m, MODO_PORTADA, PORTAFOLIO_BASE)
  const ficha = await fetch(`${ORIGEN}/api/public/portafolio/proyectos/${m.slug}`).then((r) => r.json())
  const galeria = ficha.fotos ?? []
  if (galeria.length !== esperadas.length || galeria.some((f, i) => f.alt !== esperadas[i].alt)) {
    galeriasMal.push(`${m.slug}: ${galeria.length} de ${esperadas.length} (alt ${galeria[0]?.alt ?? '—'}…)`)
  }
}
comprobar('galerías que no coinciden con el manifest', 0, galeriasMal.length, galeriasMal.slice(0, 10).join('\n       '))

// --- Muestreo de fichas públicas ------------------------------------------
const muestra = [...manifest].sort(() => Math.random() - 0.5).slice(0, 8)
const muestraMal = []
for (const m of muestra) {
  const res = await fetch(`${ORIGEN}/api/public/portafolio/proyectos/${m.slug}`)
  const ficha = await res.json().catch(() => null)
  const n = ficha?.fotos?.length ?? 0
  if (res.status !== 200 || n < 1) muestraMal.push(`${m.slug}: ${res.status} con ${n} fotos`)
  await espera(120)
}
comprobar('muestreo de 8 fichas públicas (200 y ≥1 foto)', 0, muestraMal.length, muestraMal.join(', '))

const homePortafolio = await fetch(`${ORIGEN}/portafolio`)
comprobar('GET /portafolio', 200, homePortafolio.status)

// --- Última puerta: check-tables ------------------------------------------
console.log('\n--- node infra/scripts/check-tables.js ---')
let checkOk = false
try {
  const salida = execFileSync('node', ['infra/scripts/check-tables.js'], { encoding: 'utf8' })
  process.stdout.write(salida)
  checkOk = salida.includes('✓ OK') && !salida.includes('✗')
} catch (e) {
  process.stdout.write(String(e.stdout ?? ''))
  process.stderr.write(String(e.stderr ?? ''))
}
comprobar('check-tables sin faltantes', true, checkOk)

const fallos = resultados.filter((r) => !r.ok)
console.log(`\n=== ${resultados.length - fallos.length}/${resultados.length} comprobaciones OK ===`)
if (fallos.length > 0) {
  console.log('Fallos:')
  for (const f of fallos) console.log(`  ${f.nombre}: esperado ${JSON.stringify(f.esperado)}, real ${JSON.stringify(f.real)}`)
  process.exit(1)
}
console.log('Verificación en verde.')
