/**
 * Rutas y lectura compartidas del set base del portafolio de Bogotá.
 *
 * El set base vive en `infra/seed/portafolio-bogota/` (manifest + 190 carpetas
 * `NNN-slug/`). La variable de entorno `PORTAFOLIO_BASE` sobreescribe la ruta,
 * para poder apuntar a una copia sin tocar el repo.
 *
 * Lo comparten el cargador (`portafolio-bogota-cargar.mjs`), el verificador
 * (`reinit-verificar.mjs`), el orquestador (`reinit.mjs`) y las pruebas de
 * flujo (`portafolio-pruebas-flujo.mjs`), de forma que "qué fotos se suben y en
 * qué orden" se calcula en un único sitio.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const PORTAFOLIO_BASE = path.resolve(
  process.env.PORTAFOLIO_BASE ?? 'infra/seed/portafolio-bogota',
)

export const MANIFEST_CSV = path.join(PORTAFOLIO_BASE, 'manifest.csv')

/** Modo de portada: `unica` (sin repetir la portada) o `duplicada` (legacy). */
export const MODOS_PORTADA = ['unica', 'duplicada']

// Parser CSV con comillas: la galería trae `;` y comas dentro de campos
// entrecomillados, así que no vale un `split(',')` a secas.
export function leerCsv(archivo) {
  const txt = fs.readFileSync(archivo, 'utf8').trim()
  const [head, ...filas] = txt.split('\n')
  const cols = head.split(',')
  return filas
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const vals = []
      let cur = ''
      let comillas = false
      for (const ch of l) {
        if (comillas) {
          if (ch === '"') comillas = false
          else cur += ch
        } else if (ch === '"') comillas = true
        else if (ch === ',') {
          vals.push(cur)
          cur = ''
        } else cur += ch
      }
      vals.push(cur)
      return Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? '']))
    })
}

export function leerManifiesto(base = PORTAFOLIO_BASE) {
  const archivo = path.join(base, 'manifest.csv')
  if (!fs.existsSync(archivo)) {
    throw new Error(
      `No encuentro el manifiesto en ${archivo}. ` +
        '¿El set base está en su sitio? (PORTAFOLIO_BASE lo puede sobreescribir)',
    )
  }
  return leerCsv(archivo)
}

function sha1(absolutePath) {
  return crypto.createHash('sha1').update(fs.readFileSync(absolutePath)).digest('hex')
}

// Dos archivos son la misma imagen si pesan igual y su hash coincide. El tamaño
// se compara primero porque es casi gratis y descarta la mayoría.
function mismaImagen(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false
  const sa = fs.statSync(a)
  const sb = fs.statSync(b)
  if (sa.size !== sb.size) return false
  return sha1(a) === sha1(b)
}

/** Número de folder (`000`, `001`, …) de una fila del manifiesto. */
export function numeroDe(fila) {
  return String(fila.orden).padStart(3, '0')
}

/** Carpeta de una fila del manifiesto. */
export function carpetaDe(fila, base = PORTAFOLIO_BASE) {
  return path.join(base, `${numeroDe(fila)}-${fila.slug}`)
}

/** Rutas relativas de la galería del manifiesto (`NNN-slug/00.jpg`). */
export function galeriaDe(fila) {
  return fila.galeria
    ? fila.galeria.split(';').map((g) => g.trim()).filter(Boolean)
    : []
}

/**
 * Fotos que se suben de una fila, en orden, ya resuelto el modo de portada.
 *
 * - `duplicada`: `portada.jpg` + todas las de galería (comportamiento histórico,
 *   que repite la portada cuando `00.jpg` es la misma imagen).
 * - `unica`: igual, pero se omiten las de galería que son la misma imagen que la
 *   portada. Es el modo por defecto porque deja una fila por foto real.
 *
 * El `alt` de cada foto es `<titulo> — vista <i>` con `i` = posición en esta
 * lista. Como la lista es determinista, el verificador puede reconstruirla y
 * así saber qué falta y en qué orden sin adivinar nada.
 */
export function fotosDe(fila, modoPortada = 'unica', base = PORTAFOLIO_BASE) {
  if (!MODOS_PORTADA.includes(modoPortada)) {
    throw new Error(`Modo de portada desconocido: ${modoPortada}`)
  }
  const carpeta = carpetaDe(fila, base)
  const portada = path.join(carpeta, 'portada.jpg')
  const galeria = galeriaDe(fila)
  const archivos = ['portada.jpg']
  for (const rel of galeria) {
    if (modoPortada === 'unica' && mismaImagen(portada, path.join(base, rel))) continue
    archivos.push(path.basename(rel))
  }
  return archivos.map((archivo, i) => ({
    archivo,
    indice: i,
    alt: `${fila.titulo} — vista ${i}`,
  }))
}

/**
 * Filas que debería haber en `proyectos_fotos` de la sede Bogotá en un modo
 * dado. Se calcula desde el manifiesto, no a palo, para que el verificador no
 * dependa de un número escrito a mano.
 */
export function conteoEsperado(manifest, modoPortada = 'unica', base = PORTAFOLIO_BASE) {
  return manifest.reduce(
    (total, fila) => total + fotosDe(fila, modoPortada, base).length,
    0,
  )
}

/** Carpetas `NNN-*` del set base, para el preflight. */
export function carpetasBase(base = PORTAFOLIO_BASE) {
  if (!fs.existsSync(base)) return []
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{3}-/.test(e.name))
    .map((e) => e.name)
}
