// Distribucion del tamano de galeria y detalle de las repeticiones de portada.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ORG = process.argv[2] ?? 'Carpinteria Antigua/organizado'
const txt = fs.readFileSync(path.join(ORG, 'manifest.csv'), 'utf8').trim()
const [head, ...filas] = txt.split('\n')
const cols = head.split(',')
function parseLine(l) {
  const vals = []; let cur = ''; let q = false
  for (const ch of l) {
    if (q) { if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { vals.push(cur); cur = '' }
    else cur += ch
  }
  vals.push(cur)
  return Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? '']))
}
const rows = filas.filter((l) => l.trim() !== '').map(parseLine)
const h = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex')

const dist = {}
const solo00 = []
const iguales = []
let galTotal = 0
for (const m of rows) {
  const g = m.galeria ? m.galeria.split(';').map((x) => x.trim()).filter(Boolean) : []
  dist[g.length] = (dist[g.length] ?? 0) + 1
  galTotal += g.length
  if (g.length === 1) solo00.push(`${m.orden}-${m.slug}`)
  const nn = String(m.orden).padStart(3, '0')
  if (h(path.join(ORG, `${nn}-${m.slug}`, 'portada.jpg')) === h(path.join(ORG, `${nn}-${m.slug}`, '00.jpg'))) iguales.push(`${nn}-${m.slug}`)
}
console.log('distribucion de tamano de galeria:', JSON.stringify(dist))
console.log('galeria total:', galTotal)
console.log('proyectos con galeria de 1:', solo00.length)
console.log('solo-00 muestra:', solo00.slice(0, 50))
console.log('portada==00.jpg:', iguales.length)
console.log('interseccion 1-entry y iguales:', solo00.filter((s) => iguales.includes(s)).length)
