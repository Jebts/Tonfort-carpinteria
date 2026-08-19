// Helpers client-side para consumir los Route Handlers del staff.
// Todas lanzan Error si la respuesta no es ok.

import type { Cliente, Cita, Proyecto } from "@/lib/supabase/types"

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

export async function guardarCliente(
  body: Partial<Cliente> & { id?: string },
): Promise<Cliente> {
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

// --- Proyectos ---
export async function getProyectos(): Promise<Proyecto[]> {
  const data = await req<{ proyectos: Proyecto[] }>("/api/staff/proyectos")
  return data.proyectos
}

export async function guardarProyecto(
  body: Partial<Proyecto> & { id?: string },
): Promise<Proyecto> {
  if (body.id) {
    const data = await req<{ proyecto: Proyecto }>(`/api/staff/proyectos/${body.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    return data.proyecto
  }
  const data = await req<{ proyecto: Proyecto }>("/api/staff/proyectos", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.proyecto
}

export async function eliminarProyecto(id: string): Promise<void> {
  await req(`/api/staff/proyectos/${id}`, { method: "DELETE" })
}
