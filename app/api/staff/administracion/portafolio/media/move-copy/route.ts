import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase/server"
import { requireRol } from "@/lib/staff-auth"
import { sanitizeError } from "@/lib/errors"
import { z } from "zod"

const moveCopySchema = z.object({
  origenProyectoId: z.string().uuid(),
  destinoProyectoId: z.string().uuid(),
  items: z.array(z.object({
    tipo: z.enum(["foto", "visor", "portada"]),
    id: z.string().uuid(),
  })).min(1),
  accion: z.enum(["mover", "copiar"]),
})

// POST /api/staff/administracion/portafolio/media/move-copy
export async function POST(req: NextRequest) {
  const auth = requireRol(req, ["admin"])
  if (auth) return auth

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

  const parsed = moveCopySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { origenProyectoId, destinoProyectoId, items, accion } = parsed.data

  if (origenProyectoId === destinoProyectoId) {
    return NextResponse.json({ error: "El proyecto origen y destino no pueden ser el mismo" }, { status: 400 })
  }

  // Obtener sedes de ambos proyectos
  const { data: proyectos, error: proyectosError } = await supabase
    .from("proyectos")
    .select("id, sede")
    .in("id", [origenProyectoId, destinoProyectoId])

  if (proyectosError || !proyectos || proyectos.length !== 2) {
    return NextResponse.json({ error: "Proyectos no encontrados" }, { status: 404 })
  }

  const origenProyecto = proyectos.find(p => p.id === origenProyectoId)
  const destinoProyecto = proyectos.find(p => p.id === destinoProyectoId)

  if (!origenProyecto || !destinoProyecto) {
    return NextResponse.json({ error: "Proyectos no encontrados" }, { status: 404 })
  }

  // Validar: visores solo entre Santa Marta
  const hayVisores = items.some(item => item.tipo === "visor")
  if (hayVisores && (origenProyecto.sede !== "santa_marta" || destinoProyecto.sede !== "santa_marta")) {
    return NextResponse.json({ error: "Los visores 3D solo se pueden mover/copiar entre proyectos de Santa Marta" }, { status: 400 })
  }

  const resultados: { tipo: string; id: string; success: boolean; error?: string; omitido?: string; advertencia?: string }[] = []

  // Siguiente `orden` de la galería destino: se lee una vez y se incrementa
  // por cada foto movida o copiada (los ítems se procesan en orden).
  let ordenFotosBase = -1
  let fotosAgregadas = 0
  const siguienteOrdenFotoDestino = async (): Promise<number> => {
    if (ordenFotosBase < 0) {
      const { data: maxOrden } = await supabase
        .from("proyectos_fotos")
        .select("orden")
        .eq("proyecto_id", destinoProyectoId)
        .order("orden", { ascending: false })
        .limit(1)
        .maybeSingle()
      ordenFotosBase = (maxOrden?.orden ?? -1) + 1
    }
    return ordenFotosBase + fotosAgregadas++
  }

  // Procesar cada item
  for (const item of items) {
    try {
      if (item.tipo === "foto") {
        if (accion === "mover") {
          // Mover conserva el contenido pero recoloca al final del destino,
          // para que el `orden` heredado no se intercale con la galería.
          const { error } = await supabase
            .from("proyectos_fotos")
            .update({ proyecto_id: destinoProyectoId, orden: await siguienteOrdenFotoDestino() })
            .eq("id", item.id)
            .eq("proyecto_id", origenProyectoId)

          if (error) throw error
        } else {
          // Copiar: obtener la foto original y crear nueva.
          const { data: foto, error } = await supabase
            .from("proyectos_fotos")
            .select("url, alt")
            .eq("id", item.id)
            .eq("proyecto_id", origenProyectoId)
            .maybeSingle()

          if (error || !foto) throw error || new Error("Foto no encontrada")

          const { error: insertError } = await supabase
            .from("proyectos_fotos")
            .insert({
              proyecto_id: destinoProyectoId,
              url: foto.url,
              alt: foto.alt,
              orden: await siguienteOrdenFotoDestino(),
            })

          if (insertError) throw insertError
        }
        resultados.push({ tipo: "foto", id: item.id, success: true })
      }

      else if (item.tipo === "visor") {
        const { data: visor, error } = await supabase
          .from("proyectos_visores")
          .select("propuesta_id")
          .eq("id", item.id)
          .eq("proyecto_id", origenProyectoId)
          .maybeSingle()

        if (error || !visor) throw error || new Error("Visor no encontrado")

        // El destino no puede tener dos veces la misma propuesta (índice
        // único). Se detecta antes para no depender del código de error.
        const { data: duplicado } = await supabase
          .from("proyectos_visores")
          .select("id")
          .eq("proyecto_id", destinoProyectoId)
          .eq("propuesta_id", visor.propuesta_id)
          .maybeSingle()

        if (duplicado) {
          resultados.push({
            tipo: "visor",
            id: item.id,
            success: false,
            omitido: "El proyecto destino ya muestra esta propuesta",
          })
          continue
        }

        if (accion === "mover") {
          const { data: maxOrden } = await supabase
            .from("proyectos_visores")
            .select("orden")
            .eq("proyecto_id", destinoProyectoId)
            .order("orden", { ascending: false })
            .limit(1)
            .maybeSingle()

          const { error: updateError } = await supabase
            .from("proyectos_visores")
            .update({ proyecto_id: destinoProyectoId, orden: (maxOrden?.orden ?? -1) + 1 })
            .eq("id", item.id)
            .eq("proyecto_id", origenProyectoId)

          if (updateError) throw updateError
        } else {
          const { data: maxOrden } = await supabase
            .from("proyectos_visores")
            .select("orden")
            .eq("proyecto_id", destinoProyectoId)
            .order("orden", { ascending: false })
            .limit(1)
            .maybeSingle()

          const { error: insertError } = await supabase
            .from("proyectos_visores")
            .insert({
              proyecto_id: destinoProyectoId,
              propuesta_id: visor.propuesta_id,
              orden: (maxOrden?.orden ?? -1) + 1,
              activo: true,
            })

          if (insertError) throw insertError
        }
        resultados.push({ tipo: "visor", id: item.id, success: true })
      }

      else if (item.tipo === "portada") {
        // Obtener la portada del origen (y la del destino, para avisar si se
        // sobrescribe una distinta).
        const { data: proyectos, error: proyectosError } = await supabase
          .from("proyectos")
          .select("id, portada_url")
          .in("id", [origenProyectoId, destinoProyectoId])

        if (proyectosError || !proyectos) {
          throw proyectosError ?? new Error("Proyectos no encontrados")
        }

        const origen = proyectos.find((p) => p.id === origenProyectoId)
        const destino = proyectos.find((p) => p.id === destinoProyectoId)

        if (!origen?.portada_url) {
          throw new Error("Proyecto origen no tiene portada")
        }

        const sobrescribe = !!destino?.portada_url && destino.portada_url !== origen.portada_url

        if (accion === "mover") {
          const [resDestino, resOrigen] = await Promise.all([
            supabase.from("proyectos").update({ portada_url: origen.portada_url }).eq("id", destinoProyectoId),
            supabase.from("proyectos").update({ portada_url: null }).eq("id", origenProyectoId),
          ])
          if (resDestino.error) throw resDestino.error
          if (resOrigen.error) throw resOrigen.error
        } else {
          const { error } = await supabase
            .from("proyectos")
            .update({ portada_url: origen.portada_url })
            .eq("id", destinoProyectoId)
          if (error) throw error
        }

        resultados.push({
          tipo: "portada",
          id: item.id,
          success: true,
          ...(sobrescribe
            ? { advertencia: "Se reemplazó la portada que tenía el proyecto destino" }
            : {}),
        })
      }
    } catch (err) {
      console.error(`[move-copy] Error procesando ${item.tipo} ${item.id}:`, sanitizeError(err))
      resultados.push({ tipo: item.tipo, id: item.id, success: false, error: err instanceof Error ? err.message : "Error desconocido" })
    }
  }

  return NextResponse.json({ resultados })
}