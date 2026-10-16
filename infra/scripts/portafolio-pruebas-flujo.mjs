#!/usr/bin/env node
/**
 * Pruebas de flujo T1-T8 (Fase 5 del plan mayor) sobre proyectos desechables.
 * Usa los mismos endpoints que la UI. Crea proyectos «PRUEBA ...» y los borra.
 *
 * Uso: node infra/scripts/portafolio-pruebas-flujo.mjs [--origen http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { PORTAFOLIO_BASE } from './portafolio-paths.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')
const IMAGEN = path.join(PORTAFOLIO_BASE, '072-cocina-kaleth-rodriguez', 'portada.jpg')
const IMAGEN2 = path.join(PORTAFOLIO_BASE, '101-closet-2017-09-01', 'portada.jpg')

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
let cookie = ''

async function api(ruta, init = {}) {
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
  return { status: res.status, json }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const resultados = []
function check(id, accion, esperado, real) {
  const ok = esperado === real
  resultados.push({ id, accion, esperado, real, ok })
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${id}: ${accion} — esperado ${esperado}, real ${real}`)
}

async function subirFoto(proyectoId, archivo, alt) {
  const form = new FormData()
  form.append('file', new Blob([fs.readFileSync(archivo)], { type: 'image/jpeg' }), path.basename(archivo))
  form.append('alt', alt)
  return api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`, { method: 'POST', body: form })
}

const login = await fetch(`${ORIGEN}/api/staff/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario, password: env.INITIAL_ADMIN_PASSWORD }),
})
cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
if (login.status !== 200) {
  console.error('Login fallido')
  process.exit(1)
}
console.log(`Login OK\n`)

const titulo = 'PRUEBA Flujo Tonfort'
const slugsCreados = []

// T1 — crear
const creado = await api('/api/staff/diseno/proyectos', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ titulo, descripcion: 'Proyecto desechable de pruebas de flujo' }),
})
const id = creado.json?.proyecto?.id
const slug = creado.json?.proyecto?.slug
slugsCreados.push(slug)
check('T1', 'crear proyecto', 201, creado.status)
check('T1', 'no aparece en /portafolio sin publicar', false, await api(`/api/public/portafolio/proyectos/${slug}`).then((r) => r.status === 200))

const panel1 = await api('/api/staff/administracion/portafolio/proyectos')
const fila = (panel1.json?.proyectos ?? []).find((p) => p.id === id)
check('T1', 'aparece en el panel como borrador', true, Boolean(fila) && fila.publicado === false)

// T2 — publicar con sede bogota + 1 foto + portada
const foto1 = await subirFoto(id, IMAGEN, 'PRUEBA vista 0')
check('T2', 'subir foto', 201, foto1.status)
const patch2 = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ sede: 'bogota', categoria: 'closet', publicado: true, orden: 998, portada_url: foto1.json?.foto?.url }),
})
check('T2', 'publicar en bogota', 200, patch2.status)
const publico2 = await api(`/api/public/portafolio/proyectos/${slug}`)
check('T2', 'ficha publica responde 200', 200, publico2.status)
check('T2', 'sede bogota en la ficha', 'bogota', publico2.json?.proyecto?.sede)

// T3 — cambiar categoria y orden
const patch3 = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ categoria: 'mueble_tv', orden: 999 }),
})
const publico3 = await api(`/api/public/portafolio/proyectos/${slug}`)
check('T3', 'categoria cambia a mueble_tv', 'mueble_tv', publico3.json?.proyecto?.categoria)

// T4 — usar otra foto como portada
const foto2 = await subirFoto(id, IMAGEN2, 'PRUEBA vista 1')
check('T4', 'subir segunda foto', 201, foto2.status)
const patch4 = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ portada_url: foto2.json?.foto?.url }),
})
const publico4 = await api(`/api/public/portafolio/proyectos/${slug}`)
check('T4', 'portada cambia al recargar', foto2.json?.foto?.url, publico4.json?.proyecto?.portada_url)

// T5 — despublicar
const patch5 = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ publicado: false }),
})
const publico5 = await api(`/api/public/portafolio/proyectos/${slug}`)
check('T5', 'desaparece de lo publico', 404, publico5.status)
const panel5 = await api('/api/staff/administracion/portafolio/proyectos')
check('T5', 'sigue en el panel', true, (panel5.json?.proyectos ?? []).some((p) => p.id === id))

// T6 — republicar y eliminar la foto de galeria (la que NO es portada)
const patch6 = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ publicado: true }),
})
const galeriaAntes = (await api(`/api/staff/administracion/portafolio/proyectos/${id}/fotos`)).json?.fotos ?? []
const noPortada = galeriaAntes.find((f) => f.url !== publico4.json?.proyecto?.portada_url)
const borrado = await api(`/api/staff/administracion/portafolio/proyectos/${id}/fotos/${noPortada?.id}`, { method: 'DELETE' })
check('T6', 'eliminar foto de galeria', 200, borrado.status)
const galeriaDespues = (await api(`/api/staff/administracion/portafolio/proyectos/${id}/fotos`)).json?.fotos ?? []
check('T6', 'galeria baja a la anterior', galeriaAntes.length - 1, galeriaDespues.length)

// T6b — eliminar la foto que SI es portada limpia portada_url
const portada = galeriaDespues.find((f) => f.url === publico4.json?.proyecto?.portada_url)
const borradoPortada = await api(`/api/staff/administracion/portafolio/proyectos/${id}/fotos/${portada?.id}`, { method: 'DELETE' })
check('T6b', 'eliminar la foto portada', 200, borradoPortada.status)
const trasBorrarPortada = await api(`/api/staff/administracion/portafolio/proyectos/${id}`)
check('T6b', 'portada_url se limpia', null, trasBorrarPortada.json?.proyecto?.portada_url ?? null)

// T7 — eliminar proyecto
const borradoProy = await api(`/api/staff/administracion/portafolio/proyectos/${id}`, { method: 'DELETE' })
check('T7', 'eliminar proyecto', 200, borradoProy.status)
const publico7 = await api(`/api/public/portafolio/proyectos/${slug}`)
check('T7', 'ficha da 404', 404, publico7.status)

// T8 — sede santa_marta en proyecto de prueba
const creado8 = await api('/api/staff/diseno/proyectos', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ titulo: 'PRUEBA Sede Tonfort' }),
})
const id8 = creado8.json?.proyecto?.id
const slug8 = creado8.json?.proyecto?.slug
const f8 = await subirFoto(id8, IMAGEN, 'PRUEBA sede')
await api(`/api/staff/administracion/portafolio/proyectos/${id8}`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ sede: 'santa_marta', categoria: 'closet', publicado: true, orden: 997, portada_url: f8.json?.foto?.url }),
})
const publico8 = await api(`/api/public/portafolio/proyectos/${slug8}`)
check('T8', 'proyecto de prueba visible en santa_marta', 'santa_marta', publico8.json?.proyecto?.sede)
await api(`/api/staff/administracion/portafolio/proyectos/${id8}/fotos/${f8.json?.foto?.id}`, { method: 'DELETE' })
await api(`/api/staff/administracion/portafolio/proyectos/${id8}`, { method: 'DELETE' })
console.log('T8: proyecto de prueba eliminado (revertido)')

const fallos = resultados.filter((r) => !r.ok)
console.log(`\nResumen: ${resultados.length - fallos.length}/${resultados.length} comprobaciones OK`)
if (fallos.length > 0) {
  console.log('Fallos:')
  for (const f of fallos) console.log(`  ${f.id}: ${f.accion} — esperado ${f.esperado}, real ${f.real}`)
  process.exit(1)
}
