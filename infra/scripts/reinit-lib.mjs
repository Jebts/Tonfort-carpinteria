/**
 * Preflight común del reinit (`npm run db:reinit`).
 *
 * Lo comparten el orquestador (`reinit.mjs`), el cargador
 * (`portafolio-bogota-cargar.mjs`) y el verificador (`reinit-verificar.mjs`), para
 * que "está todo listo" signifique lo mismo en los tres.
 *
 * Todo aquí es de solo lectura salvo `snapshotPrevio()`, que vuelca el estado
 * actual a `/tmp` antes de que el reset borre nada. El reset es destructivo e
 * irreversible, así que el snapshot no es opcional.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { PORTAFOLIO_BASE, carpetasBase, leerManifiesto, numeroDe } from './portafolio-paths.mjs'

export const TABLAS_REQUERIDAS = [
  'usuarios',
  'clientes',
  'modalidades_cita',
  'proyectos',
  'proyectos_fotos',
  'productos',
  'propuestas_3d',
  'propuestas_3d_animaciones',
  'visores_landing',
  'visores_landing_animaciones',
]

// `citas` o `cites`, según si se aplicó `20260923000000_fix_citas_table_name.sql`.
export const TABLAS_CITAS = ['citas', 'cites']

/**
 * Orden canónico de las tablas que toca el reinit: hijas antes que madres. Lo
 * usa el snapshot y el fallback de borrado fila a fila de `reset-and-seed.js`.
 * `citas`/`cites` van aparte porque su nombre real se resuelve consultando.
 */
export const ORDEN_ESQUEMA = [
  'propuestas_3d_animaciones',
  'cotizacion_producto_versiones',
  'proyectos_visores',
  'proyectos_fotos',
  'visores_landing_animaciones',
  'visores_landing',
  'cotizacion_productos',
  'cotizaciones',
  'propuestas_3d',
  'productos',
  'proyectos',
  'clientes',
  'modalidades_cita',
  'usuarios',
]

// Existen pero el reinit no las necesita para funcionar.
export const TABLAS_OPCIONALES = [
  'citas',
  'cotizaciones',
  'cotizacion_productos',
  'cotizacion_producto_versiones',
  'proyectos_visores',
]

export const BUCKETS_REQUERIDOS = ['portafolio-imagenes']

/** Carga `.env` en `process.env` sin pisar lo que ya esté en el entorno. */
export function cargarEntorno(archivo = path.resolve('.env')) {
  if (!fs.existsSync(archivo)) return {}
  const vars = {}
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const t = linea.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    vars[k] = v
    if (!(k in process.env)) process.env[k] = v
  }
  return vars
}

export function supabaseService() {
  const url = process.env.CARPINTERIA_SUPABASE_URL
  const key = process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** 1. Variables de entorno imprescindibles. */
export function comprobarEnv(requeridas) {
  const faltan = requeridas.filter((k) => !process.env[k] || process.env[k].trim() === '')
  return { ok: faltan.length === 0, faltan }
}

/** 2. Esquema: tablas + buckets. Solo lectura. */
export async function comprobarEsquema(supabase) {
  const tablas = {}
  const candidatas = [...TABLAS_REQUERIDAS, ...TABLAS_OPCIONALES, ...TABLAS_CITAS]
  for (const tabla of candidatas) {
    const { error } = await supabase.from(tabla).select('id').limit(1)
    tablas[tabla] = !error
  }
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  const nombres = bucketsError ? [] : (buckets ?? []).map((b) => b.name)
  const faltanTablas = TABLAS_REQUERIDAS.filter((t) => !tablas[t])
  const faltanBuckets = BUCKETS_REQUERIDOS.filter((b) => !nombres.includes(b))
  return {
    ok: faltanTablas.length === 0 && faltanBuckets.length === 0,
    tablas,
    buckets: nombres,
    faltanTablas,
    faltanBuckets,
    bucketsError: bucketsError?.message ?? null,
    tablaCitas: resolverTablaCitas(tablas),
  }
}

/** `citas` o `cites`, la que exista de verdad. */
export function resolverTablaCitas(tablas) {
  return TABLAS_CITAS.find((t) => tablas[t]) ?? null
}

/** 3. Set base íntegro: manifest, carpetas y archivos. */
export function comprobarSetBase(base = PORTAFOLIO_BASE) {
  let manifest = []
  try {
    manifest = leerManifiesto(base)
  } catch (e) {
    return { ok: false, manifest: [], filas: 0, problemas: [e.message], carpetasSobrantes: [], filasSinCarpeta: [] }
  }

  const problemas = []
  const esperadas = new Set(manifest.map((f) => `${numeroDe(f)}-${f.slug}`))
  const carpetas = carpetasBase(base)
  const setCarpetas = new Set(carpetas)

  for (const nombre of esperadas) {
    if (!setCarpetas.has(nombre)) problemas.push(`falta la carpeta ${nombre}`)
  }
  for (const nombre of carpetas) {
    if (!esperadas.has(nombre)) problemas.push(`carpeta sobrante ${nombre} (no está en el manifest)`)
  }

  const archivosQueFaltan = []
  for (const fila of manifest) {
    const carpeta = path.join(base, `${numeroDe(fila)}-${fila.slug}`)
    if (!fs.existsSync(path.join(carpeta, 'portada.jpg'))) {
      archivosQueFaltan.push(`${numeroDe(fila)}-${fila.slug}/portada.jpg`)
    }
    const galeria = fila.galeria
      ? fila.galeria.split(';').map((g) => g.trim()).filter(Boolean)
      : []
    for (const rel of galeria) {
      if (!fs.existsSync(path.join(base, rel))) archivosQueFaltan.push(rel)
    }
  }
  if (archivosQueFaltan.length > 0) {
    problemas.push(`faltan ${archivosQueFaltan.length} archivos del manifest: ${archivosQueFaltan.slice(0, 10).join(', ')}${archivosQueFaltan.length > 10 ? ' …' : ''}`)
  }

  return {
    ok: problemas.length === 0,
    manifest,
    filas: manifest.length,
    problemas,
    archivosQueFaltan,
    carpetasSobrantes: carpetas.filter((c) => !esperadas.has(c)),
    filasSinCarpeta: [...esperadas].filter((c) => !setCarpetas.has(c)),
  }
}

/** 4. Servidor alcanzable. */
export async function comprobarServidor(origen) {
  try {
    const res = await fetch(`${origen}/api/public/portafolio/proyectos`, {
      signal: AbortSignal.timeout(15000),
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, error: e.message ?? String(e) }
  }
}

function csvCelda(valor) {
  const v = String(valor ?? '')
  return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function escribirCsv(archivo, columnas, filas) {
  const lineas = [columnas.join(',')]
  for (const fila of filas) lineas.push(columnas.map((c) => csvCelda(fila[c])).join(','))
  fs.writeFileSync(archivo, lineas.join('\n') + '\n', 'utf8')
}

/**
 * 5. Snapshot de seguridad antes del TRUNCATE.
 *
 * Vuelca a `/tmp/tonfort-pre-reinit-<iso>/` los conteos por tabla, los proyectos
 * actuales (con su número de fotos) y los visores de la landing, que también se
 * vacían en el reset. Read-only vía service role.
 */
export async function snapshotPrevio(supabase, tablas, destino) {
  const dir = destino && destino.trim() !== ''
    ? destino
    : path.join(os.tmpdir(), `tonfort-pre-reinit-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  fs.mkdirSync(dir, { recursive: true })

  const lineas = []
  for (const tabla of tablas) {
    const { count, error } = await supabase.from(tabla).select('id', { count: 'exact' }).limit(0)
    lineas.push(`${tabla}: ${error ? `ERROR (${error.message})` : (count ?? 0)}`)
  }
  fs.writeFileSync(path.join(dir, 'conteos-por-tabla.txt'), lineas.join('\n') + '\n', 'utf8')

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, slug, titulo, sede, categoria, orden, publicado, portada_url, created_at')
    .order('orden', { ascending: true })
  const { data: fotos } = await supabase.from('proyectos_fotos').select('proyecto_id')

  const nFotos = new Map()
  for (const f of fotos ?? []) nFotos.set(f.proyecto_id, (nFotos.get(f.proyecto_id) ?? 0) + 1)

  escribirCsv(
    path.join(dir, 'proyectos-actuales.csv'),
    ['id', 'slug', 'titulo', 'sede', 'categoria', 'orden', 'publicado', 'portada_url', 'n_fotos', 'created_at'],
    (proyectos ?? []).map((p) => ({ ...p, n_fotos: nFotos.get(p.id) ?? 0 })),
  )

  const { data: visores } = await supabase.from('visores_landing').select('*').order('orden', { ascending: true })
  const { data: animaciones } = await supabase.from('visores_landing_animaciones').select('*')
  escribirCsv(
    path.join(dir, 'visores-landing.csv'),
    visores?.[0] ? Object.keys(visores[0]) : ['id'],
    visores ?? [],
  )
  escribirCsv(
    path.join(dir, 'visores-landing-animaciones.csv'),
    animaciones?.[0] ? Object.keys(animaciones[0]) : ['id'],
    animaciones ?? [],
  )

  return { dir, proyectos: (proyectos ?? []).length, visores: (visores ?? []).length }
}

/** Resumen legible del preflight. */
export function informePreflight(partes) {
  const lineas = []
  for (const [titulo, parte] of Object.entries(partes)) {
    lineas.push(`${parte.ok ? '✓' : '✗'} ${titulo}`)
    if (!parte.ok && parte.faltan?.length) lineas.push(`    faltan: ${parte.faltan.join(', ')}`)
    if (!parte.ok && parte.problemas?.length) lineas.push(`    ${parte.problemas.join('\n    ')}`)
  }
  return lineas.join('\n')
}
