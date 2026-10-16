const fs = require('fs')
const path = require('path')

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.CARPINTERIA_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const TABLAS_ESPERADAS = [
  'usuarios',
  'clientes',
  'citas',
  'modalidades_cita',
  'proyectos',
  'proyectos_fotos',
  'productos',
  'propuestas_3d',
  'propuestas_3d_animaciones',
  'visores_landing',
  'visores_landing_animaciones',
]

// Existen en la BD pero no las necesita el flujo mínimo: se informan, no
// bloquean. `proyectos_visores` quedó pendiente de aplicar
// (`20261012000000_proyectos_visores.sql`); la galería del panel degrada sola
// si falta, pero el visor de Santa Marta no funciona sin ella.
const TABLAS_OPCIONALES = [
  'cotizaciones',
  'cotizacion_productos',
  'cotizacion_producto_versiones',
  'proyectos_visores',
]

const BUCKETS_ESPERADOS = ['visores-video', 'portafolio-imagenes']

const TABLAS_LEGACY_ELIMINADAS = [
  'portafolio_proyectos',
  'propuestas_diseno',
  'hotspots',
  'modelos',
  'modelo_materiales',
  'materiales',
  'cotizacionversiones',
  'cotizaciones_generadas',
  'propuesta_modelos',
  'producto_versiones',
  'producto_version_modelos',
  'producto_version_materiales',
  'cotizacion_items',
  'cotizacion_costos_variables',
  'cotizacion_timelines',
]

async function tableExists(tableName) {
  const { error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: false })
    .limit(0)

  return !error
}

async function getTableCount(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact' })
    .limit(0)
  
  if (error) return { count: null, error: error.message }
  return { count, error: null }
}

async function main() {
  console.log('=== Verificación de tablas de la base de datos ===\n')

  const faltan = []
  const sobran = []

  console.log('Tablas esperadas (deben existir):')
  console.log('-'.repeat(50))
  for (const tabla of TABLAS_ESPERADAS) {
    const exists = await tableExists(tabla)
    const status = exists ? '✓ OK' : '✗ FALTA'
    console.log(`  ${tabla}: ${status}`)
    if (!exists) faltan.push(tabla)
  }

  console.log('\nTablas opcionales (no bloquean):')
  console.log('-'.repeat(50))
  for (const tabla of TABLAS_OPCIONALES) {
    const exists = await tableExists(tabla)
    console.log(`  ${tabla}: ${exists ? '✓ OK' : '· ausente'}`)
  }

  console.log('\nTablas legacy (deben estar eliminadas):')
  console.log('-'.repeat(50))
  for (const tabla of TABLAS_LEGACY_ELIMINADAS) {
    try {
      const exists = await tableExists(tabla)
      const status = exists ? '✗ SIGUE EXISTIENDO' : '✓ Eliminada'
      console.log(`  ${tabla}: ${status}`)
      if (exists) sobran.push(tabla)
    } catch {
      console.log(`  ${tabla}: ✓ Eliminada`)
    }
  }

  console.log('\nConteos de datos:')
  console.log('-'.repeat(50))
  for (const tabla of TABLAS_ESPERADAS) {
    const { count, error } = await getTableCount(tabla)
    if (error) {
      console.log(`  ${tabla}: ERROR - ${error}`)
    } else {
      console.log(`  ${tabla}: ${count ?? 0} filas`)
    }
  }

  // Verificar buckets
  console.log('\nStorage buckets:')
  console.log('-'.repeat(50))
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    console.log(`  Error listando buckets: ${bucketsError.message}`)
    faltan.push(`buckets (${bucketsError.message})`)
  } else {
    for (const expectedBucket of BUCKETS_ESPERADOS) {
      const hasBucket = buckets?.some(b => b.name === expectedBucket)
      console.log(`  ${expectedBucket}: ${hasBucket ? '✓ OK' : '✗ FALTA'}`)
      if (!hasBucket) faltan.push(`bucket ${expectedBucket}`)
    }
  }

  console.log('\n=== Verificación completa ===')

  // Sale con código 1 si algo no cuadra: es la última puerta del reinit.
  if (faltan.length > 0 || sobran.length > 0) {
    console.error(`\n✗ Faltan: ${faltan.join(', ') || 'nada'}`)
    console.error(`✗ Sobran: ${sobran.join(', ') || 'nada'}`)
    console.error('Aplica las migraciones con `npm run db:migrate`.')
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })