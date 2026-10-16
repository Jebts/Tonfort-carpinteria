#!/usr/bin/env node
/**
 * Carga masiva del portafolio de Bogotá. Usa los mismos endpoints que la UI:
 * login, crear proyecto, subir fotos y publicar.
 *
 * Idempotente de verdad: si el slug ya existe no se salta y ya está, lo
 * reconcilia. Sube solo las fotos que falten, reordena si el orden no es el
 * esperado y hace PATCH solo de los metadatos que difieran. Una segunda pasada
 * sobre la misma BD deja 0 creados, 0 fotos y 0 PATCH.
 *
 * Uso:
 *   node infra/scripts/portafolio-bogota-cargar.mjs [--dry-run] [--desde N]
 *       [--solo <slug>] [--origen http://localhost:3000] [--ritmo 200]
 *       [--modo-portada unica|duplicada] [--resumen ruta.json]
 *
 * Lee `infra/seed/portafolio-bogota/manifest.csv` (PORTAFOLIO_BASE lo
 * sobreescribe) y `.env` (INITIAL_ADMIN_PASSWORD). Nunca imprime secretos.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { PORTAFOLIO_BASE, fotosDe, leerManifiesto, MODOS_PORTADA } from './portafolio-paths.mjs'
import { cargarEntorno, comprobarServidor, supabaseService } from './reinit-lib.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}

const DRY = args.includes('--dry-run')
const DESDE = Number(opt('desde', '0'))
const SOLO = opt('solo', '')
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')
const RITMO = Number(opt('ritmo', '200'))
const RESUMEN = opt('resumen', '')
const MODO_PORTADA = opt('modo-portada', 'unica')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

if (!MODOS_PORTADA.includes(MODO_PORTADA)) {
  console.error(`--modo-portada debe ser uno de: ${MODOS_PORTADA.join(' | ')} (recibido: ${MODO_PORTADA})`)
  process.exit(1)
}

cargarEntorno()
const env = process.env
const manifest = leerManifiesto(PORTAFOLIO_BASE)
const objetivoInicial = manifest.filter((m) => m.estado === 'pendiente' || DRY)

let objetivo = objetivoInicial
if (SOLO) objetivo = objetivo.filter((m) => m.slug === SOLO)
objetivo = objetivo.filter((m) => Number(m.orden) >= DESDE)

console.log('=== Carga del portafolio de Bogotá ===')
console.log(`Set base: ${PORTAFOLIO_BASE}`)
console.log(`Manifiesto: ${manifest.length} proyectos, a procesar ${objetivo.length}`)
console.log(
  `Modo de portada: ${MODO_PORTADA}` +
    (MODO_PORTADA === 'unica'
      ? ' (se omite la foto de galería que es la misma imagen que la portada)'
      : ' (comportamiento legacy: portada + 00.jpg, repite la portada)'),
)
if (DRY) console.log('MODO --dry-run: no se escribe nada')

if (objetivo.length === 0) {
  console.log('Nada que procesar.')
  process.exit(0)
}

// El cargador se apoya en el service role solo para LISTAR objetos de storage
// huérfanos (información, nunca borra). Las altas y ediciones van por la API,
// que es lo que realmente se quiere probar.
const servicio = supabaseService()

const usuario = env.INITIAL_ADMIN_USUARIO ?? 'admin@tonfort.local'
const password = env.INITIAL_ADMIN_PASSWORD
if (!password && !DRY) {
  console.error('Falta INITIAL_ADMIN_PASSWORD en .env')
  process.exit(1)
}

const servidor = DRY
  ? { ok: true, status: 0 }
  : await comprobarServidor(ORIGEN)
if (!servidor.ok) {
  console.error(`El servidor ${ORIGEN} no responde (${servidor.status || servidor.error}).`)
  console.error('Arráncalo (`npm run dev`) o usa `npm run db:reinit`, que lo arranca él.')
  process.exit(1)
}

let cookie = ''
async function api(ruta, init = {}, reintentos = 2) {
  for (let intento = 1; intento <= reintentos + 1; intento++) {
    try {
      const res = await fetch(`${ORIGEN}${ruta}`, {
        ...init,
        headers: { ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) },
      })
      const texto = await res.text()
      let json = null
      try {
        json = texto ? JSON.parse(texto) : null
      } catch {
        json = { raw: texto.slice(0, 200) }
      }
      if (res.status >= 500 && intento <= reintentos) {
        await espera(500 * intento)
        continue
      }
      return { status: res.status, json }
    } catch (e) {
      if (intento <= reintentos) {
        await espera(500 * intento)
        continue
      }
      return { status: 0, json: { error: String(e.message ?? e) } }
    }
  }
}

if (!DRY) {
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
    console.error('No se recibió cookie de sesión')
    process.exit(1)
  }
  console.log(`Login OK (rol: ${json?.sesion?.rol ?? '?'})`)
  await espera(300)
}

// Estado actual del panel. `conMedia` no hace falta: la galería se pide proyecto
// a proyecto, que es lo que hay que comparar.
let existentes = new Map()
if (!DRY) {
  const lista = await api('/api/staff/administracion/portafolio/proyectos')
  if (lista.status !== 200) {
    console.error(`No pude leer el panel (${lista.status}): ${JSON.stringify(lista.json).slice(0, 200)}`)
    process.exit(1)
  }
  existentes = new Map((lista.json?.proyectos ?? []).map((p) => [p.slug, p]))
  console.log(`Proyectos existentes en el panel: ${existentes.size}`)
}

const salida = []
const resumen = {
  modoPortada: MODO_PORTADA,
  creados: 0,
  fotosSubidas: 0,
  patches: 0,
  reordenes: 0,
  skips: 0,
  fallidos: 0,
  conflictos: 0,
  slugs: {},
  huerfanos: [],
}

/** Campos del manifest que se reconcilian contra el panel. */
function diffMetadatos(m, actual) {
  const esperado = {
    titulo: m.titulo,
    descripcion: m.descripcion || null,
    orden: Number(m.orden),
    sede: 'bogota',
    categoria: m.categoria || null,
    publicado: true,
  }
  const patch = {}
  for (const [clave, quiero] of Object.entries(esperado)) {
    const tengo = actual[clave] ?? null
    if (String(tengo ?? '') !== String(quiero ?? '')) patch[clave] = quiero
  }
  return patch
}

function normalizaUrl(url) {
  return (url ?? '').trim()
}

for (const m of objetivo) {
  const nn = String(m.orden).padStart(3, '0')
  const carpeta = `${nn}-${m.slug}`
  const existente = existentes.get(m.slug)

  if (DRY) {
    const fotos = fotosDe(m, MODO_PORTADA, PORTAFOLIO_BASE)
    console.log(`  [dry] ${m.orden} ${m.slug} (${m.categoria}) ${fotos.length} fotos${existente ? ' · ya existe' : ' · nuevo'}`)
    continue
  }

  // ---------- Alta ----------
  if (!existente) {
    const creado = await api('/api/staff/diseno/proyectos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titulo: m.titulo, descripcion: m.descripcion || null }),
    })
    if (creado.status !== 201 || !creado.json?.proyecto) {
      console.log(`  FALLO crear ${m.orden} ${m.slug} (${creado.status}): ${JSON.stringify(creado.json).slice(0, 160)}`)
      salida.push({ ...m, estado: 'fallido', nota: `crear ${creado.status}` })
      resumen.fallidos++
      continue
    }
    const proyecto = creado.json.proyecto
    // Un slug divergente crearía otra línea con sufijo -1 en la siguiente
    // pasada: se aborta la pasada entera en vez de duplicar en silencio.
    if (proyecto.slug !== m.slug) {
      console.error(`  ABORTA ${m.orden}: la API generó el slug "${proyecto.slug}" y el manifest espera "${m.slug}".`)
      console.error('  Corrige el manifest (o el título) antes de volver a cargar.')
      salida.push({ ...m, estado: 'fallido', nota: `slug divergente ${proyecto.slug}` })
      resumen.fallidos++
      break
    }

    const fotos = fotosDe(m, MODO_PORTADA, PORTAFOLIO_BASE)
    let portadaUrl = null
    for (const foto of fotos) {
      const abs = path.join(PORTAFOLIO_BASE, carpeta, foto.archivo)
      if (!fs.existsSync(abs)) {
        console.log(`  FALLO falta archivo ${carpeta}/${foto.archivo}`)
        continue
      }
      const blob = new Blob([fs.readFileSync(abs)], { type: 'image/jpeg' })
      const form = new FormData()
      form.append('file', blob, `${m.slug}-${foto.archivo.replace('.jpg', '')}.jpg`)
      form.append('alt', foto.alt)
      const subida = await api(`/api/staff/administracion/portafolio/proyectos/${proyecto.id}/fotos`, {
        method: 'POST',
        body: form,
      })
      if (subida.status !== 201 || !subida.json?.foto) {
        console.log(`  FALLO foto ${carpeta}/${foto.archivo} (${subida.status}): ${JSON.stringify(subida.json).slice(0, 120)}`)
        continue
      }
      if (foto.indice === 0) portadaUrl = subida.json.foto.url
      resumen.fotosSubidas++
      await espera(RITMO)
    }

    const patch = await api(`/api/staff/administracion/portafolio/proyectos/${proyecto.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titulo: m.titulo,
        descripcion: m.descripcion || null,
        orden: Number(m.orden),
        sede: 'bogota',
        categoria: m.categoria || null,
        publicado: true,
        portada_url: portadaUrl,
      }),
    })
    if (patch.status !== 200) {
      console.log(`  FALLO publicar ${m.slug} (${patch.status}): ${JSON.stringify(patch.json).slice(0, 120)}`)
      salida.push({ ...m, estado: 'fallido', nota: `patch ${patch.status}` })
      resumen.fallidos++
      continue
    }
    console.log(`  ok ${m.orden} ${m.slug} → ${proyecto.id} (${fotos.length} fotos, portada ${portadaUrl ? 'sí' : 'NO'})`)
    salida.push({ ...m, estado: 'cargado', nota: `id=${proyecto.id}` })
    resumen.creados++
    resumen.slugs[m.slug] = proyecto.id
    await espera(RITMO)
    continue
  }

  // ---------- Reconciliación ----------
  const proyectoId = existente.id
  resumen.slugs[m.slug] = proyectoId

  const galeria = await api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`)
  if (galeria.status !== 200) {
    console.log(`  FALLO leer galería ${m.slug} (${galeria.status})`)
    salida.push({ ...m, estado: 'fallido', nota: `galeria ${galeria.status}` })
    resumen.fallidos++
    continue
  }
  const actuales = galeria.json?.fotos ?? []
  const porAlt = new Map(actuales.map((f) => [f.alt, f]))

  const esperadas = fotosDe(m, MODO_PORTADA, PORTAFOLIO_BASE)
  const faltan = esperadas.filter((f) => !porAlt.has(f.alt))

  for (const foto of faltan) {
    const abs = path.join(PORTAFOLIO_BASE, carpeta, foto.archivo)
    if (!fs.existsSync(abs)) {
      console.log(`  FALLO falta archivo ${carpeta}/${foto.archivo}`)
      continue
    }
    const blob = new Blob([fs.readFileSync(abs)], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, `${m.slug}-${foto.archivo.replace('.jpg', '')}.jpg`)
    form.append('alt', foto.alt)
    const subida = await api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`, {
      method: 'POST',
      body: form,
    })
    if (subida.status !== 201 || !subida.json?.foto) {
      console.log(`  FALLO foto ${carpeta}/${foto.archivo} (${subida.status}): ${JSON.stringify(subida.json).slice(0, 120)}`)
      continue
    }
    console.log(`  + ${m.slug}: subida ${foto.archivo}`)
    resumen.fotosSubidas++
    await espera(RITMO)
  }

  // Estado tras las subidas, para decidir reorden y portada.
  const trasSubidas = await api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`)
  const filas = trasSubidas.json?.fotos ?? []

  const extrasAlt = filas.filter((f) => !esperadas.some((e) => e.alt === f.alt))
  if (filas.length !== esperadas.length || extrasAlt.length > 0) {
    // No se borra nada: un cambio de modo (unica ↔ duplicada) deja fotos de más
    // y hay que decidirlo a mano.
    console.log(
      `  CONFLICTO ${m.slug}: la galería tiene ${filas.length} fotos y en modo ${MODO_PORTADA} debería tener ${esperadas.length}.` +
        (extrasAlt.length > 0 ? ` Sobran: ${extrasAlt.map((f) => f.alt).slice(0, 5).join(', ')}` : ''),
    )
    salida.push({ ...m, estado: 'conflicto', nota: `${filas.length} de ${esperadas.length} fotos` })
    resumen.conflictos++
    continue
  }

  if (filas.some((f, i) => f.alt !== esperadas[i].alt)) {
    const reorden = await api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos/reorder`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: filas.map((f) => f.id) }),
    })
    if (reorden.status !== 200) {
      console.log(`  FALLO reorden ${m.slug} (${reorden.status})`)
      salida.push({ ...m, estado: 'fallido', nota: `reorden ${reorden.status}` })
      resumen.fallidos++
      continue
    }
    console.log(`  ~ ${m.slug}: galería reordenada`)
    resumen.reordenes++
  }

  const patch = diffMetadatos(m, existente)
  // La portada es siempre la primera foto de la galería.
  const portadaUrl = normalizaUrl(filas[0]?.url) || null
  if (normalizaUrl(existente.portada_url) !== (portadaUrl ?? '')) patch.portada_url = portadaUrl

  if (Object.keys(patch).length > 0) {
    const enviado = await api(`/api/staff/administracion/portafolio/proyectos/${proyectoId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (enviado.status !== 200) {
      console.log(`  FALLO patch ${m.slug} (${enviado.status}): ${JSON.stringify(enviado.json).slice(0, 120)}`)
      salida.push({ ...m, estado: 'fallido', nota: `patch ${enviado.status}` })
      resumen.fallidos++
      continue
    }
    console.log(`  ~ ${m.slug}: ${Object.keys(patch).join(', ')}`)
    resumen.patches++
    salida.push({ ...m, estado: 'reconciliado', nota: Object.keys(patch).join(';') })
  } else {
    salida.push({ ...m, estado: 'skip', nota: 'sin cambios' })
    resumen.skips++
  }

  // Huérfanos de storage: solo se informan.
  if (servicio) {
    const { data: objetos, error: listError } = await servicio.storage
      .from('portafolio-imagenes')
      .list(proyectoId, { limit: 1000 })
    if (!listError && objetos) {
      const usados = new Set(filas.map((f) => path.basename(f.url ?? '')))
      const huerfanos = objetos
        .filter((o) => o.name !== '.emptyFolderPlaceholder' && !usados.has(o.name))
        .map((o) => `${proyectoId}/${o.name}`)
      if (huerfanos.length > 0) {
        resumen.huerfanos.push(...huerfanos)
        console.log(`  ! ${m.slug}: ${huerfanos.length} objeto(s) huérfano(s) en storage (no se borran)`)
      }
    }
  }
}

console.log(
  `\nResumen: creados=${resumen.creados} fotos=${resumen.fotosSubidas} patches=${resumen.patches} ` +
    `reordenes=${resumen.reordenes} skips=${resumen.skips} conflictos=${resumen.conflictos} fallidos=${resumen.fallidos}`,
)
console.log(`Objetos huérfanos en storage: ${resumen.huerfanos.length}`)

// Estado por proyecto (derivado, gitignored). En --dry-run no se escribe nada.
if (!DRY) {
  const columnas = [...new Set([...Object.keys(manifest[0] ?? {}), 'estado', 'nota'])]
  const lineas = [columnas.join(',')]
  for (const m of manifest) {
    const fila = salida.find((s) => s.orden === m.orden) ?? m
    lineas.push(columnas.map((c) => {
      const v = fila[c] ?? ''
      return /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)
    }).join(','))
  }
  fs.writeFileSync(path.join(PORTAFOLIO_BASE, 'manifest.estado.csv'), lineas.join('\n') + '\n', 'utf8')
  console.log(`Estado escrito en ${path.join(PORTAFOLIO_BASE, 'manifest.estado.csv')}`)
}

if (RESUMEN) {
  fs.writeFileSync(RESUMEN, JSON.stringify(resumen, null, 2) + '\n', 'utf8')
  console.log(`Resumen máquina-legible en ${RESUMEN}`)
}

if (resumen.fallidos > 0) process.exit(1)
