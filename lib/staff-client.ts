// Helpers client-side para consumir los Route Handlers del staff.
// Solo incluye los servicios del nuevo esquema video-only.
// Los servicios legacy de cotizaciones/materiales se eliminaron.

import type { Cliente, Cita, Proyecto, Producto, Propuesta3D, Propuesta3DAnimacion } from "@/lib/supabase/types"

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `Error ${res.status}`)
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
export async function getCitas(desde: Date, hasta: Date, cliente?: string): Promise<{ slots: unknown[]; citas: Cita[] }> {
  const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() })
  if (cliente) params.set("cliente", cliente)
  return req(`/api/staff/citas?${params.toString()}`)
}

export async function accionCita(
  id: string,
  accion: "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar",
  fecha_hora?: string,
): Promise<Cita> {
  const data = await req<{ cita: Cita }>(`/api/staff/citas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ accion, fecha_hora }),
  })
  return data.cita
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