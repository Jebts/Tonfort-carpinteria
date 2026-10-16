#!/usr/bin/env node
/**
 * Verificacion final (Fase 7 del plan mayor): cruza el manifiesto con lo que hay
 * en la BD via los mismos endpoints, y muestrea fichas publicas.
 *
 * Uso: node infra/scripts/portafolio-verificar.mjs [--origen http://localhost:3000]
 *
 * Lee `infra/seed/portafolio-bogota/manifest.csv` (PORTAFOLIO_BASE lo sobreescribe)
 * y `.env` (INITIAL_ADMIN_PASSWORD). Solo informa: no aserta ni sale con código
 * de error. Para la verificación estricta está `reinit-verificar.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { leerManifiesto } from './portafolio-paths.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')

function leerEnv(archivo) {
  const vars = {}
  for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i === -1) continue
    vars[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return vars
}

const env = leerEnv(path.resolve('.env'))
const usuario = env.INITIAL_ADMIN_USUARIO ?? 'admin@tonfort.local'
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const login = await fetch(`${ORIGEN}/api/staff/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario, password: env.INITIAL_ADMIN_PASSWORD }),
})
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
if (login.status !== 200) {
  console.error('Login fallido')
  process.exit(1)
}

async function api(ruta) {
  const res = await fetch(`${ORIGEN}${ruta}`, { headers: { cookie } })
  const j = await res.json().catch(() => null)
  return { status: res.status, json: j }
}

const panel = await api('/api/staff/administracion/portafolio/proyectos')
const todos = panel.json?.proyectos ?? []
const publicos = await fetch(`${ORIGEN}/api/public/portafolio/proyectos`).then((r) => r.json())
const bogota = publicos.proyectos.filter((p) => p.sede === 'bogota')
const santa = publicos.proyectos.filter((p) => p.sede === 'santa_marta')
const manifest = leerManifiesto()

console.log('=== Verificacion final del portafolio de Bogota ===')
console.log(`Manifiesto: ${manifest.length} proyectos`)
console.log(`Panel staff: ${todos.length} proyectos (${todos.filter((p) => p.sede === 'bogota').length} bogota, ${todos.filter((p) => p.sede === 'santa_marta').length} santa_marta)`)
console.log(`Publicos: ${bogota.length} bogota + ${santa.length} santa_marta = ${publicos.proyectos.length}`)

const bogotaPanel = todos.filter((p) => p.sede === 'bogota')
const sinPublicar = bogotaPanel.filter((p) => !p.publicado)
console.log(`\nProyectos de Bogota sin publicar: ${sinPublicar.length}`)
for (const p of sinPublicar) console.log(`  ${p.slug} — titulo: ${p.titulo}`)

const slugsPanel = new Set(bogotaPanel.map((p) => p.slug))
const faltan = manifest.filter((m) => !slugsPanel.has(m.slug))
console.log(`\nProyectos del manifiesto que no estan en el panel: ${faltan.length}`)
for (const m of faltan.slice(0, 20)) console.log(`  ${m.orden} ${m.slug}`)

const porCategoria = new Map()
for (const p of bogota) porCategoria.set(p.categoria ?? 'sin-categoria', (porCategoria.get(p.categoria ?? 'sin-categoria') ?? 0) + 1)
console.log('\nBogota por categoria:')
for (const [c, n] of [...porCategoria.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`)

const sinPortada = bogota.filter((p) => !p.portada_url)
console.log(`\nFichas sin portada (caerian en FALLBACK_PORTADA): ${sinPortada.length}`)
for (const p of sinPortada.slice(0, 10)) console.log(`  ${p.slug}`)

const muestra = [...bogota].sort(() => Math.random() - 0.5).slice(0, 8)
console.log(`\nMuestreo de ${muestra.length} fichas:`)

let fotosTotales = 0
for (const p of muestra) {
  const ficha = await fetch(`${ORIGEN}/api/public/portafolio/proyectos/${p.slug}`).then((r) => r.json())
  const n = ficha.fotos?.length ?? 0
  fotosTotales += n
  await espera(120)
  console.log(`  ${ficha.status === 404 ? 'FALLO 404' : 'ok'} ${p.slug}: ${n} fotos, visor ${ficha.visor ? 'si' : 'no'}`)
}

console.log(`\nFotos en la muestra: ${fotosTotales}`)
console.log(`\nLista /portafolio responde: ${(await fetch(`${ORIGEN}/portafolio`)).status}`)
