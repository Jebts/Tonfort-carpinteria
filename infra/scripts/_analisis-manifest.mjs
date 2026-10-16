// Analisis temporal del manifiesto (borrar despues de usarlo).
import fs from 'node:fs'
import path from 'node:path'

const ORG = process.argv[2] ?? 'infra/seed/portafolio-bogota'
const txt = fs.readFileSync(path.join(ORG, 'manifest.csv'), 'utf8').trim()
const [head, ...filas] = txt.split('\n')
const cols = head.split(',')

function parseLine(l) {
  const vals = []
  let cur = ''
  let comillas = false
  for (const ch of l) {
    if (comillas) {
      if (ch === '"') comillas = false
      else cur += ch
    } else if (ch === '"') comillas = true
    else if (ch === ',') { vals.push(cur); cur = '' }
    else cur += ch
  }
  vals.push(cur)
  return Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? '']))
}

const rows = filas.filter((l) => l.trim() !== '').map(parseLine)
const cats = {}
let galeria = 0
let vacias = 0
const sinArchivo = []
const portadasRepetidas = new Set()
const estadoSet = new Set()
const totalFotos = {}
for (const m of rows) {
  cats[m.categoria] = (cats[m.categoria] ?? 0) + 1
  estadoSet.add(m.estado)
  const g = m.galeria ? m.galeria.split(';').map((x) => x.trim()).filter(Boolean) : []
  if (g.length === 0) vacias++
  galeria += g.length
  for (const rel of g) {
    const p = path.join(ORG, rel)
    if (!fs.existsSync(p)) sinArchivo.push(rel)
  }
  const nn = String(m.orden).padStart(3, '0')
  const carpeta = path.join(ORG, `${nn}-${m.slug}`)
  if (!fs.existsSync(path.join(carpeta, 'portada.jpg'))) sinArchivo.push(`${nn}-${m.slug}/portada.jpg`)
  // ¿la portada esta tambien en la galeria como 00.jpg?
  const primera = path.basename(g[0] ?? '')
  const a = fs.existsSync(path.join(carpeta, '00.jpg')) && g[0] === `${nn}-${m.slug}/00.jpg`
  portadasRepetidas.add(a ? 'con-00' : 'sin-00')
  const jpgs = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.jpg')) : []
  totalFotos[m.slug] = jpgs.length
}
console.log('filas:', rows.length)
console.log('categorias:', JSON.stringify(cats, null, 2))
console.log('galeria total:', galeria)
console.log('sin galeria:', vacias)
console.log('00.jpg presente:', [...portadasRepetidas])
console.log('estados:', [...estadoSet])
console.log('archivos faltantes:', sinArchivo.length, sinArchivo.slice(0, 10))
console.log('total fotos en disco (suma jpg):', Object.values(totalFotos).reduce((a, b) => a + b, 0))
console.log('filas esperadas modo unica:', galeria + rows.length)
console.log('filas esperadas modo duplicada:', galeria + rows.length + vacias)

// Carpetas vs filas
const dirs = fs.readdirSync(ORG, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
const esperadas = new Set(rows.map((m) => `${String(m.orden).padStart(3, '0')}-${m.slug}`))
console.log('carpetas NNN-:', dirs.length)
console.log('carpetas sobrantes:', dirs.filter((d) => !esperadas.has(d)))
console.log('filas sin carpeta:', [...esperadas].filter((d) => !dirs.includes(d)))
const archivosRaiz = fs.readdirSync(ORG).filter((f) => !fs.statSync(path.join(ORG, f)).isDirectory())
console.log('archivos en raiz:', archivosRaiz)
const tam = dirs.map((d) => {
  let t = 0
  for (const f of fs.readdirSync(path.join(ORG, d))) t += fs.statSync(path.join(ORG, d, f)).size
  return t
})
console.log('bytes carpetas:', tam.reduce((a, b) => a + b, 0))
