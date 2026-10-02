import { createClient } from "@/lib/supabase/server"
import type { CotizacionConProyecto, CotizacionConDetalles, EstadoCotizacion, CotizacionProducto, CotizacionPropuesta } from "@/lib/supabase/types"

export async function obtenerCotizaciones() {
  const supabase = createClient()
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      *,
      proyectos!inner(
        id,
        titulo,
        slug,
        clientes!inner(
          id,
          nombre,
          email
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as CotizacionConProyecto[]
}

export async function crearCotizacion(proyectoId: string, clienteId: string) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  // Generar token único
  const token = crypto.randomUUID().replace(/-/g, "").substring(0, 32)
  
  // Crear cotización
  const { data: cotizacion, error: cotizacionError } = await supabase
    .from("cotizaciones")
    .insert({
      proyecto_id: proyectoId,
      cliente_id: clienteId,
      token,
      estado: "creada" as EstadoCotizacion,
    })
    .select()
    .single()

  if (cotizacionError) throw cotizacionError

  // Copiar productos del proyecto a cotizacion_productos
  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("orden")

  if (productos) {
    for (const producto of productos) {
      const { data: cotizacionProducto } = await supabase
        .from("cotizacion_productos")
        .insert({
          cotizacion_id: cotizacion.id,
          producto_id: producto.id,
          titulo: producto.titulo,
          descripcion: producto.descripcion,
          orden: producto.orden,
        })
        .select()
        .single()

      if (cotizacionProducto) {
        // Copiar propuestas del producto a cotizacion_propuestas
        const { data: propuestas } = await supabase
          .from("propuestas_3d")
          .select("*")
          .eq("producto_id", producto.id)
          .order("orden")

        if (propuestas) {
          for (const propuesta of propuestas) {
            await supabase
              .from("cotizacion_propuestas")
              .insert({
                cotizacion_producto_id: cotizacionProducto.id,
                propuesta_id: propuesta.id,
                titulo: propuesta.titulo,
                descripcion: propuesta.descripcion,
                video_global_url: propuesta.video_global_url,
                frame_centro_ms: propuesta.frame_centro_ms,
                precio_cotizacion: propuesta.precio_cotizacion,
                seleccionada_por_cliente: propuesta.seleccionada_por_cliente,
                orden: propuesta.orden,
              })
          }
        }
      }
    }
  }

  return cotizacion
}

export async function obtenerCotizacionPorId(id: string) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      *,
      proyectos!inner(
        id,
        titulo,
        slug,
        clientes!inner(
          id,
          nombre,
          email
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data as CotizacionConProyecto
}

export async function obtenerCotizacionPorToken(token: string) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { data, error } = await supabase
    .from("cotizaciones")
    .select(`
      *,
      proyectos!inner(
        id,
        titulo,
        slug,
        clientes!inner(
          id,
          nombre,
          email
        ),
        cotizacion_productos(
          id,
          titulo,
          descripcion,
          orden,
          cotizacion_propuestas(
            id,
            titulo,
            descripcion,
            video_global_url,
            frame_centro_ms,
            precio_cotizacion,
            seleccionada_por_cliente,
            orden
          )
        )
      )
    `)
    .eq("token", token)
    .single()

  if (error) throw error
  return data as CotizacionConDetalles
}

export async function actualizarEstadoCotizacion(id: string, estado: EstadoCotizacion) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { data, error } = await supabase
    .from("cotizaciones")
    .update({ estado })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function actualizarPrecioPropuesta(cotizacionPropuestaId: string, precio: number) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { data, error } = await supabase
    .from("cotizacion_propuestas")
    .update({ precio_cotizacion: precio })
    .eq("id", cotizacionPropuestaId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function actualizarSeleccionCliente(cotizacionPropuestaId: string, seleccionada: boolean) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { data, error } = await supabase
    .from("cotizacion_propuestas")
    .update({ seleccionada_por_cliente: seleccionada })
    .eq("id", cotizacionPropuestaId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function eliminarCotizacionProducto(cotizacionProductoId: string) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { error } = await supabase
    .from("cotizacion_productos")
    .delete()
    .eq("id", cotizacionProductoId)

  if (error) throw error
}

export async function eliminarCotizacionPropuesta(cotizacionPropuestaId: string) {
  const supabase = createClient()
  if (!supabase) throw new Error("Supabase no configurado")
  
  const { error } = await supabase
    .from("cotizacion_propuestas")
    .delete()
    .eq("id", cotizacionPropuestaId)

  if (error) throw error
}
