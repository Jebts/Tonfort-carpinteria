#!/usr/bin/env node
/**
 * Reinit reproducible: un solo comando.
 *
 *   npm run db:reinit
 *
 * Secuencia:
 *   1. Preflight de solo lectura (env, esquema, set base, servidor).
 *   2. Snapshot de seguridad del estado actual a /tmp (el reset borra sin vuelta).
 *   3. `reset-and-seed.js full`: TRUNCATE + seed demo.
 *   4. Servidor: se levanta `next dev` en un puerto libre si ORIGEN no responde,
 *      y se mata siempre al terminar (éxito, error o Ctrl-C).
 *   5. Carga idempotente del portafolio de Bogotá.
 *   6. Verificación estricta: si falla, el reinit termina con código 1.
 *
 * Uso:
 *   node infra/scripts/reinit.mjs [--seco] [--solo-cargar] [--sin-servidor]
 *                                [--desde N] [--solo <slug>]
 *                                [--modo-portada unica|duplicada] [--origen URL]
 *                                [--snapshot ruta]
 *
 *   --seco          solo el preflight: no se escribe nada.
 *   --solo-cargar   se salta el TRUNCATE y el seed (para probar la idempotencia
 *                   sobre una base ya cargada).
 *   --sin-servidor  no levanta `next dev`: exige que ORIGEN ya responda.
 */
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { MODOS_PORTADA } from './portafolio-paths.mjs'
import {
  cargarEntorno,
  comprobarEnv,
  comprobarEsquema,
  comprobarServidor,
  comprobarSetBase,
  ORDEN_ESQUEMA,
  snapshotPrevio,
  TABLAS_OPCIONALES,
  TABLAS_REQUERIDAS,
  supabaseService,
} from './reinit-lib.mjs'
const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i !== -1 && args[i + 1] != null ? args[i + 1] : d
}
const SECO = args.includes('--seco')
const SOLO_CARGAR = args.includes('--solo-cargar')
const SIN_SERVIDOR = args.includes('--sin-servidor')
const DESDE = opt('desde', '0')
const SOLO = opt('solo', '')
const MODO_PORTADA = opt('modo-portada', 'unica')
const ORIGEN = opt('origen', 'http://localhost:3000').replace(/\/$/, '')
const SNAPSHOT = opt('snapshot', '')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

if (!MODOS_PORTADA.includes(MODO_PORTADA)) {
  console.error(`--modo-portada debe ser uno de: ${MODOS_PORTADA.join(' | ')}`)
  process.exit(1)
}

const paso = (n, texto) => console.log(`\n${'='.repeat(64)}\n${n}. ${texto}\n${'='.repeat(64)}`)

function fallo(texto) {
  console.error(`\n✗ ${texto}`)
  process.exit(1)
}

function correr(comando, argumentos, opciones = {}) {
  const resultado = execFileSync(comando, argumentos, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opciones,
  })
  process.stdout.write(resultado)
  return resultado
}

/**
 * Levanta `next dev` en un puerto libre y espera a que responda. El plan es que
 * el reinit no dependa de que alguien tenga el servidor arrancado a mano.
 */
async function levantarServidor() {
  paso(4, 'Servidor de desarrollo')
  const puerto = await new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
  origen = `http://localhost:${puerto}`
  console.log(`· levantando \`next dev -p ${puerto}\` en ${origen}`)

  hijo = spawn('npx', ['next', 'dev', '-p', String(puerto)], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  })
  hijo.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`El servidor de desarrollo salió con código ${code}`)
  })

  const limite = Date.now() + 90_000
  while (Date.now() < limite) {
    await espera(1000)
    const r = await comprobarServidor(origen)
    if (r.ok) {
      console.log('✓ Servidor listo')
      return
    }
    if (hijo.exitCode !== null) break
  }
  matarServidor()
  fallo('El servidor no arrancó en 90 s. Prueba `npm run dev` a mano y pasa --origen.')
}

// =========================================================================
// 1. Preflight (solo lectura)
// =========================================================================
cargarEntorno()
paso(1, 'Preflight')

const vars = comprobarEnv([
  'CARPINTERIA_SUPABASE_URL',
  'CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY',
  'SESSION_SECRET',
  'INITIAL_ADMIN_PASSWORD',
])
if (!vars.ok) {
  fallo(`Faltan variables de entorno: ${vars.faltan.join(', ')}. Añádelas a .env y vuelve a intentarlo.`)
}
console.log('✓ Variables de entorno')

const servicio = supabaseService()
if (!servicio) fallo('No pude crear el cliente de Supabase con las credenciales de .env')

const esquema = await comprobarEsquema(servicio)
console.log(
  esquema.ok
    ? `✓ Esquema (${TABLAS_REQUERIDAS.length} tablas y buckets ${esquema.buckets.join(', ')})`
    : `✗ Esquema: faltan ${[...esquema.faltanTablas, ...esquema.faltanBuckets].join(', ')}`,
)
if (!esquema.ok) {
  console.error('\nAplica las migraciones antes de continuar:')
  console.error('  npm run db:migrate')
  console.error('(requiere SUPABASE_ACCESS_TOKEN en .env; o aplica el SQL a mano en el panel de Supabase)\n')
  fallo('El esquema no está completo.')
}
const ausentes = TABLAS_OPCIONALES.filter((t) => !esquema.tablas[t])
if (ausentes.length > 0) {
  console.log(`  · aviso: tablas opcionales ausentes (el reinit no las necesita): ${ausentes.join(', ')}`)
}

const base = comprobarSetBase()
console.log(
  base.ok
    ? `✓ Set base íntegro (${base.filas} proyectos, carpetas y archivos del manifest presentes)`
    : '✗ Set base incompleto',
)
if (!base.ok) {
  for (const p of base.problemas) console.error(`    ${p}`)
  fallo('El set base no está íntegro. No se carga nada a medias.')
}

const servidor = await comprobarServidor(ORIGEN)
if (servidor.ok) {
  console.log(`✓ Servidor respondiendo en ${ORIGEN}`)
} else if (SIN_SERVIDOR) {
  fallo(`${ORIGEN} no responde y se pasó --sin-servidor. Arráncalo con \`npm run dev\`.`)
} else {
  console.log(`· ${ORIGEN} no responde todavía: se levantará uno al llegar el momento`)
}

console.log('\nPreflight en verde.')

if (SECO) {
  console.log('\n--seco: no se escribe nada. Fin.')
  process.exit(0)
}

// =========================================================================
// 2. Snapshot de seguridad
// =========================================================================
if (!SOLO_CARGAR) {
  paso(2, 'Snapshot de seguridad previo al reset')
  const existentes = ORDEN_ESQUEMA.filter((t) => esquema.tablas[t])
  if (esquema.tablaCitas) existentes.push(esquema.tablaCitas)
  const snap = await snapshotPrevio(servicio, existentes, SNAPSHOT)
  console.log(`✓ Estado actual volcado en ${snap.dir}`)
  console.log(`  · ${snap.proyectos} proyectos y ${snap.visores} visores de landing guardados ahí`)
  console.log('  El reset es destructivo: si algo se pierde, se recupera de este volcado.')
}

// =========================================================================
// 3. Reset + seed demo
// =========================================================================
if (SOLO_CARGAR) {
  console.log('\n--solo-cargar: se salta el TRUNCATE y el seed demo.')
} else {
  paso(3, 'Reset + seed demo (reset-and-seed.js full)')
  try {
    correr('node', ['infra/scripts/reset-and-seed.js', 'full'])
  } catch (e) {
    fallo(`El reset/seed demo falló (código ${e.status}). Nada se cargó encima.`)
  }
}

// =========================================================================
// 4. Servidor
// =========================================================================
let hijo = null
let origen = ORIGEN
const matarServidor = () => {
  if (!hijo || hijo.exitCode !== null) return
  try {
    hijo.kill('SIGTERM')
  } catch {
    // ya estaba muerto
  }
}
process.on('SIGINT', () => {
  matarServidor()
  process.exit(130)
})
process.on('SIGTERM', () => {
  matarServidor()
  process.exit(143)
})

servidor.ok || (await levantarServidor())

// =========================================================================
// 5. Carga del portafolio de Bogotá
// =========================================================================
paso(5, 'Carga del portafolio de Bogotá')
const resumenRuta = path.join(
  fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'tonfort-reinit-')),
  'resumen-carga.json',
)
let cargaOk = true
try {
  correr('node', [
    'infra/scripts/portafolio-bogota-cargar.mjs',
    '--origen', origen,
    '--modo-portada', MODO_PORTADA,
    ...(Number(DESDE) > 0 ? ['--desde', String(DESDE)] : []),
    ...(SOLO ? ['--solo', SOLO] : []),
    '--resumen', resumenRuta,
  ])
} catch (e) {
  cargaOk = false
  process.stderr.write(String(e.stderr ?? ''))
}

// =========================================================================
// 6. Verificación estricta
// =========================================================================
paso(6, 'Verificación estricta')
let verificacionOk = false
try {
  correr('node', [
    'infra/scripts/reinit-verificar.mjs',
    '--origen', origen,
    '--modo-portada', MODO_PORTADA,
  ])
  verificacionOk = true
} catch {
  verificacionOk = false
}

matarServidor()

if (!cargaOk || !verificacionOk) {
  console.error('\n✗ El reinit no quedó en verde. Revisa la salida de arriba.')
  process.exit(1)
}

if (fs.existsSync(resumenRuta)) {
  const r = JSON.parse(fs.readFileSync(resumenRuta, 'utf8'))
  console.log(
    `\nResumen de la carga: creados=${r.creados} fotos=${r.fotosSubidas} patches=${r.patches} ` +
      `reordenes=${r.reordenes} skips=${r.skips} conflictos=${r.conflictos} fallidos=${r.fallidos}`,
  )
  if (r.huerfanos?.length > 0) {
    console.log(`Objetos huérfanos en el bucket portafolio-imagenes: ${r.huerfanos.length} (no se borran)`)
  }
}

console.log('\n✓ Reinit completo y verificado.')
