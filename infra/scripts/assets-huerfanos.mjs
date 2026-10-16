#!/usr/bin/env node
/**
 * Busca archivos en `public/` sin ninguna referencia en el código de la app.
 * En Next.js, `public/archivo.ext` se sirve en `/archivo.ext`, así que
 * normalizamos las referencias quitando la `/` inicial.
 * Solo lectura: no borra nada. Úsalo como red de seguridad tras borrados.
 *
 * Uso: node infra/scripts/assets-huerfanos.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const PUBLIC_DIR = path.resolve('public')
const BUSCAR_EN = ['app', 'components', 'content', 'lib', 'hooks', 'tests']

function leerArchivos(dir, prefijo = '') {
  const archivos = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      archivos.push(...leerArchivos(ruta, path.join(prefijo, entrada.name)))
    } else {
      archivos.push(path.join(prefijo, entrada.name))
    }
  }
  return archivos
}

/**
 * Extrae todas las rutas que parecen referencias a assets públicos.
 * Normaliza: quita `/` inicial, `./`, `../`, comillas, paréntesis.
 * Devuelve rutas relativas a la raíz del sitio (p.ej. `sede/hero-sede.png`).
 */
function contenidoReferencia(archivo) {
  const txt = fs.readFileSync(archivo, 'utf8')
  const referencias = new Set()

  // 1. src="..." href="..." url("...") url('...') url(...) en CSS/JS/TSX
  const regex1 = /(?:src|href|url)\s*[=:]\s*["'`]?\s*(\/?[^"'`\)\s]+\.(?:jpg|jpeg|png|webp|avif|svg|mp4|webm|mov|pdf|ico|woff2?|mp3|wav|ogg|webmanifest))["'`]?/gi
  let match
  while ((match = regex1.exec(txt)) !== null) {
    let ref = match[1].replace(/^\/+/, '')
    if (ref && !ref.startsWith('http') && !ref.startsWith('data:')) referencias.add(ref)
  }

  // 2. Rutas crudas en strings: "/archivo.ext" o 'archivo.ext' (Next public assets)
  const regex2 = /["'`]\/?([^"'`\s]+\.(?:jpg|jpeg|png|webp|avif|svg|mp4|webm|mov|pdf|ico|woff2?))["'`]/g
  while ((match = regex2.exec(txt)) !== null) {
    let ref = match[1].replace(/^\/+/, '')
    if (ref && !ref.startsWith('http') && !ref.startsWith('data:')) referencias.add(ref)
  }

  return referencias
}

function main() {
  console.log('=== Búsqueda de assets huérfanos en public/ ===\n')

  const assets = leerArchivos(PUBLIC_DIR)
  console.log(`Archivos en public/: ${assets.length}`)

  const todasRefs = new Set()
  for (const dir of BUSCAR_EN) {
    if (!fs.existsSync(dir)) continue
    for (const archivo of leerArchivos(dir)) {
      const full = path.resolve(dir, archivo)
      if (fs.statSync(full).size > 1_000_000) continue // salta binarios grandes
      for (const ref of contenidoReferencia(full)) todasRefs.add(ref)
    }
  }
  console.log(`Referencias únicas a assets encontradas: ${todasRefs.size}`)

  const huérfanos = []
  for (const asset of assets) {
    const normalizado = asset.replace(/\\/g, '/')
    // Saltar README y .gitkeep etc.
    if (normalizado === 'README.md' || normalizado.endsWith('.gitkeep')) continue
    if (todasRefs.has(normalizado)) continue
    // Solo extensiones de asset conocidas
    if (!/\.(jpg|jpeg|png|webp|avif|svg|mp4|webm|mov|pdf|ico|woff2?|mp3|wav|ogg|webmanifest)$/i.test(normalizado)) continue
    huérfanos.push(normalizado)
  }

  if (huérfanos.length === 0) {
    console.log('\n✓ No se encontraron assets huérfanos (todos tienen referencia en código).')
  } else {
    console.log(`\n✗ ${huérfanos.length} asset(s) sin referencia aparente en código:`)
    for (const h of huérfanos.sort()) console.log(`  ${h}`)
    console.log('\nNota: puede haber falsos positivos (referencias dinámicas, CSS variables, etc.).')
    process.exit(1)
  }
}

main()