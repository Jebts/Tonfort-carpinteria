#!/usr/bin/env node
/**
 * Borra los proyectos de Bogota del portafolio (y sus fotos, para no dejar
 * objetos huerfanos en el bucket `portafolio-imagenes`).
 *
 * Pensado para poder recargar desde cero: primero borra las fotos una a una
 * (`DELETE .../fotos/[fotoId]`, que borra fila y objeto) y solo cuando la
 * galeria esta vacia borra el proyecto.
 *
 * NUNCA toca proyectos de otra sede: el filtro `sede=bogota` es obligatorio y
 * no se puede desactivar.
 *
 * Uso:
 *   node infra/scripts/portafolio-borrar-bogota.mjs [--dry-run] [--solo <slug>]
 *       [--desde N] [--origen http://localhost:3000] [--ritmo 120]
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}
const DRY = args.includes('--dry-run')
const SOLO = opt('solo', '')
const DESDE = Number(opt('desde', '0'))
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')
const RITMO = Number(opt('ritmo', '120'))

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
const password = env.INITIAL_ADMIN_PASSWORD
if (!password) {
  console.error('Falta INITIAL_ADMIN_PASSWORD en .env')
  process.exit(1)
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let cookie = ''

async function api(ruta, init = {}, reintentos = 2) {
  for (let intento = 1; intento <= reintentos + 1; intento++) {
    try {
      const res = await fetch(`${ORIGEN}${ruta}`, {
        ...init,
        headers: { ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) },
      })
      const txt = await res.text()
      let json = null
      try {
        json = txt ? JSON.parse(txt) : null
      } catch {
        json = { raw: txt.slice(0, 200) }
      }
      if (res.status >= 500 && intento <= reintentos) {
        await espera(400 * intento)
        continue
      }
      return { status: res.status, json }
    } catch (e) {
      if (intento <= reintentos) {
        await espera(400 * intento)
        continue
      }
      return { status: 0, json: { error: String(e.message ?? e) } }
    }
  }
}

{
  const res = await fetch(`${ORIGEN}/api/staff/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  })
  const json = await res.json().catch(() => null)
  if (res.status !== 200) {
    console.error(`Login fallido (${res.status}): ${JSON.stringify(json)}`)
    process.exit(1)
  }
  cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
  if (!cookie) {
    console.error('No se recibio cookie de sesion')
    process.exit(1)
  }
  console.log(`Login OK (rol: ${json?.sesion?.rol ?? '?'})`)
  await espera(200)
}

const panel = await api('/api/staff/administracion/portafolio/proyectos')
if (panel.status !== 200) {
  console.error(`No se pudo listar el panel (${panel.status}): ${JSON.stringify(panel.json).slice(0, 160)}`)
  process.exit(1)
}

const todos = panel.json?.proyectos ?? []
const bogota = todos
  .filter((p) => p.sede === 'bogota')
  .filter((p) => !SOLO || p.slug === SOLO)
  .filter((p) => (p.orden ?? 0) >= DESDE)
  .sort((a, b) => (b.orden ?? 0) - (a.orden ?? 0))

const fuera = todos.filter((p) => p.sede !== 'bogota').length
console.log(`Panel: ${todos.length} proyectos (${bogota.length} de bogota a borrar, ${fuera} de otra sede que se quedan intactos)`)
if (DRY) console.log('MODO --dry-run: no se borra nada')
if (bogota.length === 0) process.exit(0)

let fotosBorradas = 0
let proyectosBorrados = 0
const fallos = []

for (const p of bogota) {
  const fotos = await api(`/api/staff/administracion/portafolio/proyectos/${p.id}/fotos`)
  const lista = fotos.json?.fotos ?? []
  if (DRY) {
    console.log(`  [dry] ${p.orden} ${p.slug}: ${lista.length} fotos + proyecto`)
    fotosBorradas += lista.length
    proyectosBorrados++
    continue
  }
  for (const f of lista) {
    const r = await api(`/api/staff/administracion/portafolio/proyectos/${p.id}/fotos/${f.id}`, { method: 'DELETE' })
    if (r.status === 200) fotosBorradas++
    else fallos.push(`foto ${f.id} de ${p.slug}: ${r.status}`)
    await espera(RITMO)
  }
  const restantes = (await api(`/api/staff/administracion/portafolio/proyectos/${p.id}/fotos`)).json?.fotos ?? []
  if (restantes.length > 0) {
    fallos.push(`${p.slug}: quedan ${restantes.length} fotos, no se borra el proyecto`)
    console.log(`  FALLO ${p.slug}: quedan ${restantes.length} fotos`)
    continue
  }
  const r = await api(`/api/staff/administracion/portafolio/proyectos/${p.id}`, { method: 'DELETE' })
  if (r.status === 200) {
    proyectosBorrados++
    console.log(`  ok ${p.orden} ${p.slug} (${lista.length} fotos)`)
  } else {
    fallos.push(`proyecto ${p.slug}: ${r.status}`)
    console.log(`  FALLO ${p.slug}: ${r.status}`)
  }
  await espera(RITMO)
}

console.log(`\nResumen: ${fotosBorradas} fotos borradas, ${proyectosBorrados} proyectos borrados, ${fallos.length} fallos`)
for (const f of fallos.slice(0, 20)) console.log(`  ${f}`)
if (fallos.length > 0) process.exit(1)
