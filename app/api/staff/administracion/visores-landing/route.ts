import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

// Migración que convierte `visores_landing` de dos slots fijos a N visores.
const MIGRACION_CARRUSEL = "20260925000000_visores_carrusel.sql"

// La BD de producción puede seguir en el esquema anterior a esa migración:
// `slot` NOT NULL, índice único `visores_landing_slot_unq` y un CHECK que solo
// admite 'primero'/'segundo'. Con eso el carrusel de N visores es imposible
// (como máximo dos filas), así que el fallo se explica en lugar de devolver un
// 500 opaco: el editor muestra este texto en el toast, con el enlace al editor
// SQL del proyecto para aplicarla de un clic.
//
// El DDL no se puede ejecutar desde aquí: `service_role` solo llega por
// PostgREST, que no corre DDL, y el repo no tiene connection string de Postgres.
function urlMigracion(): string | null {
  const url = process.env.CARPINTERIA_SUPABASE_URL
  if (!url) return null
  const ref = new URL(url).hostname.split(".")[0]
  if (!ref || ref === "localhost") return null
  return `https://supabase.com/dashboard/project/${ref}/sql/new`
}

function errorEsquemaAntiguo(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const { code, message } = error as { code?: string; message?: string }
  if (!message?.includes("slot")) return null
  switch (code) {
    case "23502":
      return `La base de datos sigue exigiendo un valor en la columna «slot», del esquema antiguo de dos visores. Aplica la migración ${MIGRACION_CARRUSEL} para poder crear más.`
    case "23505":
      return `La base de datos sigue limitando «slot» a dos valores únicos, del esquema antiguo. Aplica la migración ${MIGRACION_CARRUSEL} para tener más de dos visores.`
    case "23514":
      return `La base de datos sigue restringiendo «slot» a «primero»/«segundo», del esquema antiguo. Aplica la migración ${MIGRACION_CARRUSEL} para crear visores del carrusel.`
    default:
      return `La columna «slot» de la base de datos no admite el carrusel de N visores. Aplica la migración ${MIGRACION_CARRUSEL}.`
  }
}

const visorSchema = z.object({
  eyebrow: z.string().max(120).nullable().optional(),
  titulo: z.string().min(1, "Título requerido").max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  // Vacío al crear: `video_global_url` es NOT NULL en el esquema y el editor
  // sube el archivo después. Un visor con la URL vacía nunca se renderiza —
  // `VideoViewer` cae en su rama "No hay video configurado".
  video_global_url: z.string().url("Se requiere un video válido").or(z.literal("")),
  frame_centro_ms: z.number().int().min(0).max(600_000),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

// GET /api/staff/administracion/visores-landing
// Lista de todos los visores con sus animaciones, en el orden en que los
// recorre el carrusel de la landing. Lectura: admin.
export async function GET(req: NextRequest) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ visores: [] })

  const { data, error } = await supabase
    .from("visores_landing")
    .select("*, animaciones:visores_landing_animaciones(*)")
    .order("orden", { ascending: true })

  if (error) {
    console.error("[GET visores-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al obtener visores" }, { status: 500 })
  }

  const visores = (data ?? []).map((visor) => {
    const { animaciones, ...resto } = visor as unknown as {
      animaciones?: { orden: number }[]
    }
    return { ...resto, animaciones: (animaciones ?? []).sort((a, b) => a.orden - b.orden) }
  })

  return NextResponse.json({ visores })
}

// POST /api/staff/administracion/visores-landing
// Crea un visor nuevo al final del carrusel. Escritura: solo admin.
export async function POST(req: NextRequest) {
  const denied = requireRol(req, ["admin"])
  if (denied) return denied

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = visorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { eyebrow, titulo, descripcion, video_global_url, frame_centro_ms, activo, orden } =
    parsed.data

  // Sin `orden` explícito, el visor nuevo va detrás del último. `video_global_url`
  // es NOT NULL en el esquema, así que el editor sube el video antes de crear.
  let siguienteOrden = orden
  if (siguienteOrden === undefined) {
    const { data: filas, error: ordenError } = await supabase
      .from("visores_landing")
      .select("orden")
      .order("orden", { ascending: false })

    if (ordenError) {
      console.error("[POST visores-landing] error al leer el orden", sanitizeError(ordenError))
      return NextResponse.json({ error: "Error al calcular el orden" }, { status: 500 })
    }

    const ultimo = (filas ?? [])[0] as { orden?: number } | undefined
    siguienteOrden = ultimo?.orden === undefined ? 0 : ultimo.orden + 1
  }

  const payload = {
    slot: null,
    eyebrow: eyebrow ?? null,
    titulo,
    descripcion: descripcion ?? null,
    video_global_url,
    frame_centro_ms,
    activo: activo ?? true,
    orden: siguienteOrden,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("visores_landing").insert(payload).select().single()

  // Antes del 500 genérico: si la BD no tiene la migración del carrusel, se
  // devuelve 409 con el nombre exacto de la migración que hay que aplicar.
  const esquemaAntiguo = errorEsquemaAntiguo(error)
  if (esquemaAntiguo) {
    console.error(
      `[POST visores-landing] esquema antiguo sin migrar (${MIGRACION_CARRUSEL}):`,
      sanitizeError(error),
    )
    return NextResponse.json(
      {
        error: esquemaAntiguo,
        migracionPendiente: MIGRACION_CARRUSEL,
        migracionUrl: urlMigracion(),
      },
      { status: 409 },
    )
  }

  if (error) {
    console.error("[POST visores-landing]", sanitizeError(error))
    return NextResponse.json({ error: "Error al crear el visor" }, { status: 500 })
  }

  return NextResponse.json({ visor: { ...(data as object), animaciones: [] } }, { status: 201 })
}