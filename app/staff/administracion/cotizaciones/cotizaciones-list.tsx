"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Folder, FileText, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import type { CotizacionConProyecto } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { CrearCotizacionModal } from "./crear-cotizacion-modal"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
    credentials: "include",
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`)
  return data
}

export function CotizacionesList() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionConProyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargarCotizaciones = async () => {
    setError(null)
    try {
      const data = await request<{ cotizaciones: CotizacionConProyecto[] }>(
        "/api/staff/administracion/cotizaciones",
      )
      setCotizaciones(data.cotizaciones ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cotizaciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarCotizaciones()
  }, [])

  const handleCrearCotizacion = async (proyectoId: string, clienteId: string) => {
    await request<{ cotizacion: CotizacionConProyecto }>(
      "/api/staff/administracion/cotizaciones",
      {
        method: "POST",
        body: JSON.stringify({ proyecto_id: proyectoId, cliente_id: clienteId }),
      },
    )
    await cargarCotizaciones()
  }

  const getEstadoIcon = (estado: CotizacionConProyecto["estado"]) => {
    switch (estado) {
      case "creada":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "enviada":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "aceptada":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rechazada":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getEstadoLabel = (estado: CotizacionConProyecto["estado"]) => {
    switch (estado) {
      case "creada":
        return "Creada"
      case "enviada":
        return "Enviada"
      case "aceptada":
        return "Aceptada"
      case "rechazada":
        return "Rechazada"
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-white/60">Cargando cotizaciones...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cotizaciones</h1>
          <p className="mt-1 text-sm text-white/60">
            Agrupa propuestas de un proyecto y gestiona precios y selecciones.
          </p>
        </div>
        <Button
          onClick={() => setModalAbierto(true)}
          className="bg-[#27272a] text-white hover:bg-[#3f3f46]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-950/70 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {cotizaciones.length === 0 ? (
        <div className="py-12 text-center">
          <Folder className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-white/60">No hay cotizaciones creadas</p>
          <p className="mt-2 text-sm text-white/40">Crea una nueva cotización para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cotizaciones.map((cotizacion) => (
            <Link
              key={cotizacion.id}
              href={`/staff/administracion/cotizaciones/${cotizacion.id}`}
              className="group block rounded-xl bg-[#121214] p-4 transition-colors hover:bg-[#1c1c1e]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#27272a] p-2">{getEstadoIcon(cotizacion.estado)}</div>
                  <div>
                    <h3 className="font-medium text-white">
                      {cotizacion.proyectos?.titulo || "Proyecto sin nombre"}
                    </h3>
                    <p className="text-sm text-white/60">
                      Cliente: {cotizacion.proyectos?.clientes?.nombre || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm text-white/60">{getEstadoLabel(cotizacion.estado)}</span>
                    <p className="text-xs text-white/40">
                      {new Date(cotizacion.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/40 transition-colors group-hover:text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalAbierto && (
        <CrearCotizacionModal
          onClose={() => setModalAbierto(false)}
          onCrear={handleCrearCotizacion}
        />
      )}
    </div>
  )
}
