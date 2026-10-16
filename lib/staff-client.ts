// Helpers client-side para consumir los Route Handlers del staff.
// Solo incluye los servicios del nuevo esquema video-only.
// Los servicios legacy de cotizaciones/materiales se eliminaron.

import type { Cliente, Cita, Proyecto, Producto, Propuesta3D, Propuesta3DAnimacion, ModalidadCita } from "@/lib/supabase/types"
import type { DisponibilidadSlot } from "@/lib/citas-service"
import { BLOQUES, DURACION_MINUTOS } from "@/lib/agenda"
import { addDays } from "date-fns"

// Error de una ruta staff conservando lo que el servidor devolvió: `pendientes`
// (qué hay que resolver para confirmar) y `conflicto` son datos que la UI
// necesita para abrir el diálogo, no solo el texto del mensaje.
export interface ErrorCita extends Error {
  status: number
  pendientes?: { id: string; nombre: string | null; fecha_hora: string }[]
  conflicto?: { id: string; nombre: string | null }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      pendientes?: { id: string; nombre: string | null; fecha_hora: string }[]
      conflicto?: { id: string; nombre: string | null }
    }
    const error = new Error(data.error ?? `Error ${res.status}`) as ErrorCita
    error.status = res.status
    error.pendientes = data.pendientes
    error.conflicto = data.conflicto
    throw error
  }
  return res.json() as Promise<T>
}

// --- Clientes ---
export async function getClientes(): Promise<Cliente[]> {
  const data = await req<{ clientes: Cliente[] }>("/api/staff/clientes")
  return data.clientes
}

export async function guardarCliente(body: Partial<Cliente> & { id?: string }): Promise<Cliente> {
  if (body.id) {
    const data = await req<{ cliente: Cliente }>(`/api/staff/clientes/${body.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    return data.cliente
  }
  const data = await req<{ cliente: Cliente }>("/api/staff/clientes", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.cliente
}

export async function eliminarCliente(id: string): Promise<void> {
  await req(`/api/staff/clientes/${id}`, { method: "DELETE" })
}

// --- Citas ---
export async function getCitas(
  desde: Date,
  hasta: Date,
  cliente?: string,
): Promise<{
  slots: DisponibilidadSlot[]
  citas: Cita[]
  modalidades?: ModalidadCita[]
}> {
  const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() })
  if (cliente) params.set("cliente", cliente)
  return req(`/api/staff/citas?${params.toString()}`)
}

// Bloques libres de un rango amplio: los usan el diálogo de confirmación y el de
// mover para ofrecer destinos a una `en_espera`.
//
// "Libre" se decide con la **misma** regla que `validarSlotLibre` en el
// servidor —solape por duración real, no coincidencia de hora exacta— para que
// la lista nunca ofrezca un destino que el backend vaya a rechazar con 409
// (una `aceptada` de 180 min a las 10:00 ocupa también las 12:00).
// El cupo es por modalidad; con `modalidadId` en null estorba cualquier
// `aceptada`, igual que en el servidor. Solo se ofrecen bloques de la retícula.
export async function getBloquesLibres(
  desde: Date,
  hasta: Date,
  modalidadId?: string | null,
): Promise<DisponibilidadSlot[]> {
  const datos = await getCitas(desde, hasta)
  const minutos = 60_000

  // Intervalos ocupados por una `aceptada` de la modalidad indicada.
  const ocupados = datos.slots
    .filter((s) => s.estado === "aceptada")
    .filter((s) =>
      s.citas.some(
        (c) =>
          c.estado === "aceptada" &&
          (modalidadId ? (c.modalidad_id ?? null) === modalidadId : true),
      ),
    )
    .map((s) => {
      const inicio = new Date(s.fecha_hora).getTime()
      return { inicio, fin: inicio + (s.duracion_minutos ?? DURACION_MINUTOS) * minutos }
    })

  return datos.slots.filter((slot) => {
    const hora = slot.fecha_hora.slice(11, 16)
    if (!BLOQUES.some((b) => b.inicio === hora)) return false
    const inicio = new Date(slot.fecha_hora).getTime()
    const fin = inicio + (slot.duracion_minutos ?? DURACION_MINUTOS) * minutos
    // Intervalos semiabiertos, como en el servidor.
    return !ocupados.some((o) => o.inicio < fin && o.fin > inicio)
  })
}

// Destinos por defecto: desde hoy, 6 semanas.
export async function getBloquesLibresProximos(
  modalidadId?: string | null,
  semanas = 6,
): Promise<DisponibilidadSlot[]> {
  const desde = new Date()
  return getBloquesLibres(desde, addDays(desde, semanas * 7), modalidadId ?? null)
}

export interface CitaAccionada extends Cita {
  /** Citas del bloque que hubo que mover/eliminar para poder confirmar. */
  resueltas?: number
}

export async function accionCita(
  id: string,
  accion: "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar",
  fecha_hora?: string,
  resolucion?: { id: string; accion: "mover" | "eliminar"; fecha_hora?: string }[],
): Promise<CitaAccionada> {
  const data = await req<{ cita: Cita; resueltas?: number }>(`/api/staff/citas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ accion, fecha_hora, resolucion }),
  })
  return { ...data.cita, resueltas: data.resueltas }
}

export async function guardarCita(body: Partial<Cita> & { id?: string }): Promise<Cita> {
  if (body.id) {
    const data = await req<{ cita: Cita }>(`/api/staff/citas/${body.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    return data.cita
  }
  const data = await req<{ cita: Cita }>("/api/staff/citas", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.cita
}

export async function eliminarCita(id: string): Promise<void> {
  await req(`/api/staff/citas/${id}`, { method: "DELETE" })
}

// --- Proyectos (diseño video-only) ---
export async function getProyectos(): Promise<Proyecto[]> {
  const data = await req<{ proyectos: Proyecto[] }>("/api/staff/diseno/proyectos")
  return data.proyectos
}

export async function getProyecto(id: string): Promise<Proyecto> {
  const data = await req<{ proyecto: Proyecto }>(`/api/staff/diseno/proyectos/${id}`)
  return data.proyecto
}

export async function guardarProyecto(body: Partial<Proyecto> & { id?: string }): Promise<Proyecto> {
  if (body.id) {
    const data = await req<{ proyecto: Proyecto }>(`/api/staff/diseno/proyectos/${body.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    return data.proyecto
  }
  const data = await req<{ proyecto: Proyecto }>("/api/staff/diseno/proyectos", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.proyecto
}

export async function eliminarProyecto(id: string): Promise<void> {
  await req(`/api/staff/diseno/proyectos/${id}`, { method: "DELETE" })
}

// --- Productos ---
export async function getProductos(proyectoId: string): Promise<Producto[]> {
  const data = await req<{ productos: Producto[] }>(`/api/staff/diseno/proyectos/${proyectoId}/productos`)
  return data.productos
}

export async function guardarProducto(
  proyectoId: string,
  body: Partial<Producto> & { id?: string },
): Promise<Producto> {
  if (body.id) {
    const data = await req<{ producto: Producto }>(
      `/api/staff/diseno/proyectos/${proyectoId}/productos/${body.id}`,
      { method: "PUT", body: JSON.stringify(body) },
    )
    return data.producto
  }
  const data = await req<{ producto: Producto }>(
    `/api/staff/diseno/proyectos/${proyectoId}/productos`,
    { method: "POST", body: JSON.stringify(body) },
  )
  return data.producto
}

export async function eliminarProducto(proyectoId: string, productoId: string): Promise<void> {
  await req(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, { method: "DELETE" })
}

// --- Propuestas ---
export async function getPropuestas(proyectoId: string, productoId: string): Promise<Propuesta3D[]> {
  const data = await req<{ propuestas: Propuesta3D[] }>(
    `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`,
  )
  return data.propuestas
}

export async function guardarPropuesta(
  proyectoId: string,
  productoId: string,
  body: Partial<Propuesta3D> & { id?: string },
): Promise<Propuesta3D> {
  if (body.id) {
    const data = await req<{ propuesta: Propuesta3D }>(
      `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${body.id}`,
      { method: "PUT", body: JSON.stringify(body) },
    )
    return data.propuesta
  }
  const data = await req<{ propuesta: Propuesta3D }>(
    `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`,
    { method: "POST", body: JSON.stringify(body) },
  )
  return data.propuesta
}

export async function eliminarPropuesta(proyectoId: string, productoId: string, propuestaId: string): Promise<void> {
  await req(
    `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}`,
    { method: "DELETE" },
  )
}

// --- Animaciones ---
export async function getAnimaciones(
  proyectoId: string,
  productoId: string,
  propuestaId: string,
): Promise<Propuesta3DAnimacion[]> {
  const data = await req<{ animaciones: Propuesta3DAnimacion[] }>(
    `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}/animaciones`,
  )
  return data.animaciones
}
