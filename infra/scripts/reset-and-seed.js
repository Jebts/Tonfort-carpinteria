const fs = require('fs')
const path = require('path')

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
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

const VISORES_VIDEO_BUCKET = 'visores-video'

async function ensureVisoresVideoBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    throw new Error(`No se pudo verificar el bucket ${VISORES_VIDEO_BUCKET}: ${listError.message}`)
  }

  const exists = buckets?.some((bucket) => bucket.name === VISORES_VIDEO_BUCKET)
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(VISORES_VIDEO_BUCKET, { public: true })
    if (createError) {
      throw new Error(`No se pudo crear el bucket ${VISORES_VIDEO_BUCKET}: ${createError.message}`)
    }
  }
}

async function uploadSeedVideo(sourcePath, objectPath) {
  const absoluteSourcePath = path.resolve(process.cwd(), sourcePath)
  const file = fs.readFileSync(absoluteSourcePath)
  const extension = path.extname(sourcePath).slice(1).toLowerCase()
  const contentType = extension === 'mov'
    ? 'video/quicktime'
    : extension === 'webm'
      ? 'video/webm'
      : 'video/mp4'

  const { error } = await supabase.storage
    .from(VISORES_VIDEO_BUCKET)
    .upload(objectPath, file, { contentType, upsert: true })

  if (error) {
    throw new Error(`No se pudo subir ${sourcePath} a ${VISORES_VIDEO_BUCKET}: ${error.message}`)
  }

  const { data, error: urlError } = supabase.storage
    .from(VISORES_VIDEO_BUCKET)
    .getPublicUrl(objectPath)

  if (urlError || !data?.publicUrl) {
    throw new Error(`No se pudo generar la URL pública de ${objectPath}`)
  }

  return data.publicUrl
}

async function prepareSeedVideos() {
  await ensureVisoresVideoBucket()

  const definitions = [
    { key: 'globalCocinaBase', source: 'public/videos/hero-furniture-loop.mp4', path: 'demo/global-cocina-base.mp4' },
    { key: 'globalCocinaPremium', source: 'public/tonfort-model-view.mp4', path: 'demo/global-cocina-premium.mp4' },
    { key: 'globalCloset', source: 'public/videos/process-inspection-loop.mp4', path: 'demo/global-closet-premium.mp4' },
    { key: 'globalMuebleTv', source: 'public/tonfort-hero.mp4', path: 'demo/global-mueble-tv.mp4' },
    { key: 'globalPuerta', source: 'public/videos/hero-furniture-loop.mp4', path: 'demo/global-puerta.mp4' },
    { key: 'globalBiblioteca', source: 'public/videos/process-inspection-loop.mp4', path: 'demo/global-biblioteca.mp4' },
    { key: 'movimientoCajon', source: 'public/videos/process-inspection-loop.mp4', path: 'demo/movimiento-cajon.mp4' },
    { key: 'accionCajon', source: 'public/videos/hero-furniture-loop.mp4', path: 'demo/accion-cajon.mp4' },
    { key: 'movimientoLed', source: 'public/tonfort-model-view.mp4', path: 'demo/movimiento-led.mp4' },
    { key: 'movimientoPuertaCloset', source: 'public/videos/hero-furniture-loop.mp4', path: 'demo/movimiento-puerta-closet.mp4' },
    { key: 'accionPuertaCloset', source: 'public/videos/process-inspection-loop.mp4', path: 'demo/accion-puerta-closet.mp4' },
    { key: 'movimientoPuerta', source: 'public/videos/process-inspection-loop.mp4', path: 'demo/movimiento-puerta.mp4' },
    { key: 'accionPuerta', source: 'public/videos/hero-furniture-loop.mp4', path: 'demo/accion-puerta.mp4' },
    { key: 'movimientoBiblioteca', source: 'public/tonfort-model-view.mp4', path: 'demo/movimiento-biblioteca.mp4' },
  ]

  const urls = {}
  for (const definition of definitions) {
    urls[definition.key] = await uploadSeedVideo(definition.source, definition.path)
  }
  return urls
}

async function getCitasTableName(supabase) {
  const { error } = await supabase.from('citas').select('id').limit(1)
  return error ? 'cites' : 'citas'
}

const TABLAS = [
  'propuestas_3d_animaciones',
  'propuestas_3d',
  'productos',
  'proyectos',
  'clientes',
  'modalidades_cita',
  'usuarios',
]

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for Node < 19
  const cryptoModule = require('crypto')
  return cryptoModule.randomUUID()
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function truncateTablas(supabase) {
  const tablasStr = TABLAS.join(', ')
  const sql = `TRUNCATE TABLE ${tablasStr} RESTART IDENTITY CASCADE`

  const { error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('Error truncating tables via RPC, falling back to row delete...')
    for (const tabla of TABLAS) {
      try {
        const { error: delError } = await supabase.from(tabla).delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (delError) console.error(`Error deleting ${tabla}:`, delError)
        else console.log(`Deleted ${tabla}.`)
      } catch (e) {
        console.error(`Error processing ${tabla}:`, e)
      }
    }
  } else {
    console.log('Truncated all tables.')
  }

  const citasTabla = await getCitasTableName(supabase)
  const { error: citasError } = await supabase.rpc('exec_sql', { sql: `TRUNCATE TABLE ${citasTabla} RESTART IDENTITY CASCADE` })
  if (citasError) {
    const { error: delError } = await supabase.from(citasTabla).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delError) console.error(`Error deleting ${citasTabla}:`, delError)
    else console.log(`Deleted ${citasTabla}.`)
  } else {
    console.log(`Truncated ${citasTabla}.`)
  }
}

async function reset() {
  console.log('Resetting database (video-only proposal platform)...')
  await truncateTablas(supabase)
  console.log('Reset complete.')
}

function generatePasswordHash(password) {
  const crypto = require('crypto')
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(password, salt, 64)
  return `${salt.toString('base64url')}:${key.toString('base64url')}`
}

async function seed() {
  console.log('Seeding test data...')

  const seedVideoUrls = await prepareSeedVideos()
  const now = new Date().toISOString()

  // ==========================================
  // 1. USUARIOS (Staff)
  // ==========================================

  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin12345'
  const adminHash = generatePasswordHash(adminPassword)

  const disenadorHash = generatePasswordHash('disenador12345')
  const asesorHash = generatePasswordHash('asesor12345')

  const usuarios = [
    {
      id: uuid(),
      email: "admin@tonfort.local",
      password_hash: adminHash,
      nombre: "Administrador",
      rol: "admin",
      foto_perfil: "https://images.unsplash.com/photo-1507003213389-2ea6327a1c10?ixlib=rb-4.0.7&auto=format&fit=crop&w=150&q=80",
      bio_publica: "Administrador del sistema Tonfort.",
      activo: true,
      creado_en: now,
      actualizado_en: now,
    },
    {
      id: uuid(),
      email: "disenador@tonfort.local",
      password_hash: disenadorHash,
      nombre: "Diseñador Test",
      rol: "disenador",
      foto_perfil: "https://images.unsplash.com/photo-1507003213389-2ea6327a1c10?ixlib=rb-4.0.7&auto=format&fit=crop&w=150&q=80",
      bio_publica: "Especialista en cocinas y closets a medida. Apasionado por el diseño funcional y los materiales sostenibles.",
      activo: true,
      creado_en: now,
      actualizado_en: now,
    },
    {
      id: uuid(),
      email: "asesor@tonfort.local",
      password_hash: asesorHash,
      nombre: "Asesor Comercial",
      rol: "asesor",
      foto_perfil: null,
      bio_publica: null,
      activo: true,
      creado_en: now,
      actualizado_en: now,
    },
  ]

  const { error: usuariosError } = await supabase.from("usuarios").insert(usuarios)
  if (usuariosError) {
    console.error("Error inserting usuarios:", usuariosError)
    process.exit(1)
  }
  console.log(`Inserted ${usuarios.length} usuarios.`)

  const adminId = usuarios[0].id
  const disenadorId = usuarios[1].id

  // ==========================================
  // 2. CLIENTES
  // ==========================================

  const clientes = [
    { id: uuid(), nombre: 'María García', email: 'maria@example.com', telefono: '3121234567', fase: 'evaluacion', info_personal: {}, descripcion_proyecto: 'Cocina integral con isla central', creado_en: now, actualizado_en: now },
    { id: uuid(), nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '3139876543', fase: 'descubrimiento', info_personal: {}, descripcion_proyecto: 'Closet walk-in para habitación principal', creado_en: now, actualizado_en: now },
    { id: uuid(), nombre: 'Ana Rodríguez', email: 'ana@example.com', telefono: '3145551234', fase: 'implementacion', info_personal: {}, descripcion_proyecto: 'Mueble de TV para sala de estar', creado_en: now, actualizado_en: now },
    { id: uuid(), nombre: 'Carlos López', email: 'carlos@example.com', telefono: '3157778888', fase: 'egresado', info_personal: {}, descripcion_proyecto: 'Puerta principal de madera maciza', creado_en: now, actualizado_en: now },
    { id: uuid(), nombre: 'Laura Martínez', email: 'laura@example.com', telefono: '3163334444', fase: 'evaluacion', info_personal: {}, descripcion_proyecto: 'Espacio integral oficina home studio', creado_en: now, actualizado_en: now },
  ]

  const { error: clientesError } = await supabase.from('clientes').insert(clientes)
  if (clientesError) {
    console.error('Error inserting clientes:', clientesError)
    process.exit(1)
  }
  console.log(`Inserted ${clientes.length} clientes.`)

  // ==========================================
  // 3. PROYECTOS (video-only design)
  // ==========================================

  const proyectos = [
    {
      id: uuid(),
      cliente_id: clientes[0].id,
      titulo: 'Cocina Moderna con Isla',
      descripcion: 'Cocina integral con isla central, mesón suspendido y iluminación LED integrada.',
      slug: 'cocina-moderna-isla',
      asignado_a: disenadorId,
      orden: 1,
      publicado: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      cliente_id: clientes[1].id,
      titulo: 'Closet Walk-In Premium',
      descripcion: 'Closet walk-in con espejos, tiras LED y sistema de organización modular.',
      slug: 'closet-walkin-premium',
      asignado_a: disenadorId,
      orden: 2,
      publicado: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      cliente_id: clientes[2].id,
      titulo: 'Mueble de TV Minimalista',
      descripcion: 'Mueble de TV con iluminación LED y gestión de cables invisible.',
      slug: 'mueble-tv-minimalista',
      asignado_a: disenadorId,
      orden: 3,
      publicado: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      cliente_id: clientes[3].id,
      titulo: 'Puerta de Madera Maciza',
      descripcion: 'Puerta principal pivotante con manijón embutido iluminado.',
      slug: 'puerta-madera-maciza',
      asignado_a: disenadorId,
      orden: 4,
      publicado: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      cliente_id: clientes[4].id,
      titulo: 'Espacio Integral Oficina',
      descripcion: 'Mobiliario completo para oficina en casa con iluminación de tarea.',
      slug: 'espacio-integral-oficina',
      asignado_a: disenadorId,
      orden: 5,
      publicado: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      cliente_id: clientes[0].id,
      titulo: 'Cocina Premium con Detalles',
      descripcion: 'Cocina premium con acabados de roble y frentes de madera maciza.',
      slug: 'cocina-premium-detalles',
      asignado_a: disenadorId,
      orden: 6,
      publicado: false,
      created_at: now,
      updated_at: now,
    },
  ]

  const { data: proyectosData, error: proyectosError } = await supabase.from('proyectos').insert(proyectos).select()
  if (proyectosError) {
    console.error('Error inserting proyectos:', proyectosError)
    process.exit(1)
  }
  console.log(`Inserted ${proyectos.length} proyectos.`)

  // ==========================================
  // 4. PRODUCTOS (contenedores por proyecto)
  // ==========================================

  const productos = [
    { id: uuid(), proyecto_id: proyectosData[0].id, titulo: 'Cocina Base', descripcion: 'Muebles base, mesón y frentes superiores.', orden: 0, created_at: now, updated_at: now },
    { id: uuid(), proyecto_id: proyectosData[0].id, titulo: 'Cocina Premium', descripcion: 'Cocina con acabados de roble y iluminación LED.', orden: 1, created_at: now, updated_at: now },
    { id: uuid(), proyecto_id: proyectosData[1].id, titulo: 'Closet Principal', descripcion: 'Sistema de guardarropas con iluminación y organización.', orden: 0, created_at: now, updated_at: now },
    { id: uuid(), proyecto_id: proyectosData[2].id, titulo: 'Mueble TV Standard', descripcion: 'Mueble de TV con espacio para equipos y gestión de cables.', orden: 0, created_at: now, updated_at: now },
    { id: uuid(), proyecto_id: proyectosData[3].id, titulo: 'Puerta Pivotante', descripcion: 'Puerta principal con manijón embutido y alpaca de pino.', orden: 0, created_at: now, updated_at: now },
    { id: uuid(), proyecto_id: proyectosData[4].id, titulo: 'Biblioteca Flotante', descripcion: 'Estantería flotante con iluminación de tarea integrada.', orden: 0, created_at: now, updated_at: now },
  ]

  const { data: productosData, error: productosError } = await supabase.from('productos').insert(productos).select()
  if (productosError) {
    console.error('Error inserting productos:', productosError)
    process.exit(1)
  }
  console.log(`Inserted ${productos.length} productos.`)

  // ==========================================
  // 5. PROPOSTAS 3D (video-only)
  // ==========================================


  const propuestas = [
    // Cocina Base - PROYECTO publicado
    {
      id: uuid(),
      producto_id: productosData[0].id,
      titulo: 'Cocina Base Estándar',
      descripcion: 'Cocina con muebles base melamina blanca, mesón de granito y tiradores de aluminio.',
      video_global_url: seedVideoUrls.globalCocinaBase,
      frame_centro_ms: 5000,
      estado: 'enviada',
      link_activo: true,
      publicada_portafolio: true,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Cocina Premium - PROYECTO publicado, en borrador
    {
      id: uuid(),
      producto_id: productosData[1].id,
      titulo: 'Cocina Premium de Madera',
      descripcion: 'Cocina con frentes de roble, mesón de granito y iluminación LED integrada.',
      video_global_url: seedVideoUrls['demo/global-cocina-premium.mp4'],
      frame_centro_ms: 3000,
      estado: 'borrador',
      link_activo: false,
      publicada_portafolio: false,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Closet Principal - PROYECTO publicado
    {
      id: uuid(),
      producto_id: productosData[2].id,
      titulo: 'Closet Walk-In Premium',
      descripcion: 'Sistema completo de walk-in con espejos y iluminación LED.',
      video_global_url: seedVideoUrls['demo/global-closet-premium.mp4'],
      frame_centro_ms: 4000,
      estado: 'enviada',
      link_activo: true,
      publicada_portafolio: true,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Mueble TV - PROYECTO NO publicado
    {
      id: uuid(),
      producto_id: productosData[3].id,
      titulo: 'Mueble de TV Minimalista',
      descripcion: 'Mueble de TV con halo perimetral y gestión de cables.',
      video_global_url: seedVideoUrls['demo/global-mueble-tv.mp4'],
      frame_centro_ms: 6000,
      estado: 'lista',
      link_activo: true,
      publicada_portafolio: false,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Puerta Pivotante - PROYECTO publicado
    {
      id: uuid(),
      producto_id: productosData[4].id,
      titulo: 'Puerta de Madera Maciza',
      descripcion: 'Puerta pivotante con manijón embutido iluminado y alpaca de pino.',
      video_global_url: seedVideoUrls['demo/global-puerta.mp4'],
      frame_centro_ms: 2000,
      estado: 'enviada',
      link_activo: true,
      publicada_portafolio: true,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Biblioteca Flotante - PROYECTO publicado
    {
      id: uuid(),
      producto_id: productosData[5].id,
      titulo: 'Biblioteca Integral',
      descripcion: 'Estantería flotante con iluminación de tarea y gestión de libros.',
      video_global_url: seedVideoUrls['demo/global-biblioteca.mp4'],
      frame_centro_ms: 3500,
      estado: 'enviada',
      link_activo: false,
      publicada_portafolio: true,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  const { data: propuestasData, error: propuestasError } = await supabase.from('propuestas_3d').insert(propuestas).select()
  if (propuestasError) {
    console.error('Error inserting propuestas_3d:', propuestasError)
    process.exit(1)
  }
  console.log(`Inserted ${propuestas.length} propuestas_3d.`)

  // ==========================================
  // 6. ANIMACIONES (video-only)
  // ==========================================

  const animaciones = [
    // Cocina Base - animación con movimiento y acción
    {
      id: uuid(),
      propuesta_id: propuestasData[0].id,
      titulo: 'Apertura de Cajón',
      descripcion: 'Animación del cajón superior abriéndose.',
      video_movimiento_url: seedVideoUrls['demo/movimiento-cajon.mp4'],
      video_accion_url: seedVideoUrls['demo/accion-cajon.mp4'],
      velocidad_normal: 1,
      velocidad_inversa: 2,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      propuesta_id: propuestasData[0].id,
      titulo: 'Encendido LED',
      descripcion: 'Animación del encendido de iluminación LED integrada.',
      video_movimiento_url: seedVideoUrls['demo/movimiento-led.mp4'],
      velocidad_normal: 1,
      velocidad_inversa: 1.5,
      orden: 1,
      created_at: now,
      updated_at: now,
    },
    // Closet - animación con movimiento y acción
    {
      id: uuid(),
      propuesta_id: propuestasData[2].id,
      titulo: 'Apertura de Puerta',
      descripcion: 'Animación de apertura de la puerta del closet.',
      video_movimiento_url: seedVideoUrls['demo/movimiento-puerta-closet.mp4'],
      video_accion_url: seedVideoUrls['demo/accion-puerta-closet.mp4'],
      velocidad_normal: 1,
      velocidad_inversa: 2,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Puerta Pivotante - animación con movimiento y acción
    {
      id: uuid(),
      propuesta_id: propuestasData[4].id,
      titulo: 'Apertura Pivotante',
      descripcion: 'Animación de apertura de la puerta pivotante.',
      video_movimiento_url: seedVideoUrls['demo/movimiento-puerta.mp4'],
      video_accion_url: seedVideoUrls['demo/accion-puerta.mp4'],
      velocidad_normal: 1,
      velocidad_inversa: 3,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
    // Biblioteca - animación solo movimiento (sin acción)
    {
      id: uuid(),
      propuesta_id: propuestasData[5].id,
      titulo: 'Ajuste de Estantería',
      descripcion: 'Animación del ajuste de estantes en la biblioteca.',
      video_movimiento_url: seedVideoUrls['demo/movimiento-biblioteca.mp4'],
      velocidad_normal: 1,
      velocidad_inversa: 2,
      orden: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  const { error: animacionesError } = await supabase.from('propuestas_3d_animaciones').insert(animaciones)
  if (animacionesError) {
    console.error('Error inserting propuestas_3d_animaciones:', animacionesError)
    process.exit(1)
  }
  console.log(`Inserted ${animaciones.length} animaciones.`)

  // ==========================================
  // 7. CITAS y MODALIDADES (Agenda - sin alterar lógica)
  // ==========================================

  const modalidadesCita = [
    { id: uuid(), nombre: 'Cotización', costo: 0, duracion_minutos: 120, activo: true, created_at: now, updated_at: now },
    { id: uuid(), nombre: 'Revisión de diseño', costo: 0, duracion_minutos: 120, activo: true, created_at: now, updated_at: now },
  ]

  const { error: modalidadesError } = await supabase.from('modalidades_cita').insert(modalidadesCita)
  if (modalidadesError) {
    console.error('Error inserting modalidades_cita:', modalidadesError)
    process.exit(1)
  }
  console.log(`Inserted ${modalidadesCita.length} modalidades_cita.`)

  const estados = ['en_espera', 'aceptada', 'cancelada']
  const origenes = ['web', 'interna']
  const descripciones = [
    'Cocina integral para apartamento',
    'Closet walk-in',
    'Mueble de TV para sala',
    'Puerta principal de madera',
    'Iluminación LED integrada',
    'Espacio integral para oficina',
  ]

  const citas = []
  for (let i = 0; i < 48; i++) {
    const fecha = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    const hours = [8, 10, 14, 16]
    const hour = randomPick(hours)
    fecha.setHours(hour, 0, 0, 0)

    const cliente = randomPick(clientes)
    const estado = randomPick(estados)
    const origen = randomPick(origenes)

    citas.push({
      id: uuid(),
      cliente_id: cliente.id,
      nombre_solicitante: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      descripcion: randomPick(descripciones),
      fecha_hora: fecha.toISOString(),
      duracion_minutos: 120,
      estado,
      origen,
      movida: false,
      fecha_hora_anterior: null,
      meet_link: estado === 'aceptada' ? 'https://meet.google.com/test-' + uuid().slice(0, 8) : null,
      notas: estado === 'aceptada' ? 'Cita confirmada' : null,
      ip: origen === 'web' ? '192.168.1.' + Math.floor(Math.random() * 255) : null,
      creado_en: new Date(fecha.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      actualizado_en: fecha.toISOString(),
    })
  }

  citas.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())

  const citasTabla = await getCitasTableName(supabase)

  const { error: citasError } = await supabase.from(citasTabla).insert(citas)
  if (citasError) {
    console.error('Error inserting citas:', citasError)
    process.exit(1)
  }
  console.log(`Inserted ${citas.length} citas.`)

  console.log('Seeding complete!')
  console.log('Demo admin login: admin@tonfort.local / (INITIAL_ADMIN_PASSWORD)')
  console.log('Demo disenador login: disenador@tonfort.local / disenador12345')
  console.log('Demo asesor login: asesor@tonfort.local / asesor12345')
  console.log('Portfolio público: /portafolio')
  console.log('Link privado demo: /propuestas/' + propuestasData.find(p => p.link_activo)?.link_token)
}

async function main() {
  const command = process.argv[2] || 'full'

  if (command === 'reset') {
    await reset()
  } else if (command === 'seed') {
    await seed()
  } else if (command === 'full') {
    await reset()
    await seed()
  } else {
    console.error(`Unknown command: ${command}`)
    console.error('Usage: node infra/scripts/reset-and-seed.js [reset|seed|full]')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})