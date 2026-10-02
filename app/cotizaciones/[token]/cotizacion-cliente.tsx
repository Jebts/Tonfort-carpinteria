"use client"

import { useState } from "react"
import { Folder, FileText, Check, ChevronRight, ChevronDown, ExternalLink, Loader2 } from "lucide-react"
import type { CotizacionConDetalles, CotizacionPropuesta } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CotizacionClienteProps {
  cotizacion: CotizacionConDetalles
  token: string
}

async function guardarSeleccion(token: string, cotizacionPropuestaId: string, seleccionada: boolean) {
  const response = await fetch(`/api/cotizaciones/link/${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cotizacion_propuesta_id: cotizacionPropuestaId, seleccionada }),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`)
}

export function CotizacionCliente({ cotizacion, token }: CotizacionClienteProps) {
  const [productosExpandidos, setProductosExpandidos] = useState<Record<string, boolean>>({})
  const [seleccionadas, setSeleccionadas] = useState<Record<string, boolean>>(() => {
    const iniciales: Record<string, boolean> = {}
    cotizacion.proyectos.cotizacion_productos.forEach((producto) => {
      producto.cotizacion_propuestas.forEach((propuesta) => {
        iniciales[propuesta.id] = propuesta.seleccionada_por_cliente
      })
    })
    return iniciales
  })
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const toggleProducto = (productoId: string) => {
    setProductosExpandidos((prev) => ({ ...prev, [productoId]: !prev[productoId] }))
  }

  const toggleSeleccion = async (cotizacionPropuestaId: string) => {
    const nuevoEstado = !seleccionadas[cotizacionPropuestaId]
    setGuardandoId(cotizacionPropuestaId)
    setError(null)
    setMensaje(null)
    setSeleccionadas((prev) => ({ ...prev, [cotizacionPropuestaId]: nuevoEstado }))

    try {
      await guardarSeleccion(token, cotizacionPropuestaId, nuevoEstado)
      setMensaje("Selección guardada")
    } catch (err) {
      setSeleccionadas((prev) => ({ ...prev, [cotizacionPropuestaId]: !nuevoEstado }))
      setError(err instanceof Error ? err.message : "Error al guardar selección")
    } finally {
      setGuardandoId(null)
    }
  }

  const propuestas = cotizacion.proyectos.cotizacion_productos.flatMap((producto) => producto.cotizacion_propuestas)
  const totalSeleccionado = Object.values(seleccionadas).filter(Boolean).length
  const precioTotal = propuestas
    .filter((propuesta) => seleccionadas[propuesta.id])
    .reduce((suma, propuesta) => suma + (propuesta.precio_cotizacion ?? 0), 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#121214]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{cotizacion.proyectos.titulo}</h1>
              <p className="text-sm text-white/60">
                Cotización para: {cotizacion.proyectos.clientes.nombre}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Total seleccionado</p>
              <p className="text-2xl font-bold">
                {totalSeleccionado} propuesta{totalSeleccionado !== 1 ? "s" : ""}
              </p>
              {precioTotal > 0 && (
                <p className="text-lg text-[#E8DFD0]">
                  ${precioTotal.toLocaleString("es-CO")}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-950/70 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-4 rounded-xl bg-emerald-950/70 px-4 py-3 text-sm text-emerald-200">
            {mensaje}
          </div>
        )}

        <p className="mb-6 text-white/60">
          Selecciona las propuestas que deseas para tu proyecto. Los cambios se guardan automáticamente.
        </p>

        <div className="space-y-4">
          {cotizacion.proyectos.cotizacion_productos.map((producto) => (
            <div
              key={producto.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#121214]"
            >
              <button
                type="button"
                onClick={() => toggleProducto(producto.id)}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-[#1c1c1e]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Folder className="h-5 w-5 shrink-0 text-white/60" />
                  <span className="truncate font-medium text-white">{producto.titulo}</span>
                  <span className="text-sm text-white/40">
                    ({producto.cotizacion_propuestas.length} propuesta{producto.cotizacion_propuestas.length !== 1 ? "s" : ""})
                  </span>
                </div>
                {productosExpandidos[producto.id] ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-white/60" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/60" />
                )}
              </button>

              {productosExpandidos[producto.id] && (
                <div className="border-t border-white/10 p-4 space-y-2">
                  {producto.cotizacion_propuestas.map((propuesta) => {
                    const seleccionada = Boolean(seleccionadas[propuesta.id])
                    return (
                      <div
                        key={propuesta.id}
                        className="flex items-center gap-3 rounded-lg bg-[#18181b] p-3"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-white/60" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{propuesta.titulo}</p>
                          {propuesta.descripcion && (
                            <p className="mt-1 text-xs text-white/60">{propuesta.descripcion}</p>
                          )}
                          {propuesta.precio_cotizacion !== null && propuesta.precio_cotizacion !== undefined && (
                            <p className="mt-1 text-sm text-[#E8DFD0]">
                              ${(propuesta.precio_cotizacion as number).toLocaleString("es-CO")}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          disabled={guardandoId === propuesta.id}
                          variant={seleccionada ? "default" : "outline"}
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-full",
                            seleccionada
                              ? "bg-[#E8DFD0] text-[#0B1D3A] hover:bg-[#d4d3c0]"
                              : "border-white/20 text-white hover:bg-[#27272a]",
                          )}
                          onClick={() => void toggleSeleccion(propuesta.id)}
                          aria-label={seleccionada ? "Quitar propuesta seleccionada" : "Seleccionar propuesta"}
                        >
                          {guardandoId === propuesta.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <ExternalLink className="h-4 w-4" />
            Tus selecciones se guardan automáticamente.
          </div>
          <div className="text-sm text-white/60">
            {totalSeleccionado} seleccionada{totalSeleccionado !== 1 ? "s" : ""} ·{" "}
            <span className="text-[#E8DFD0]">${precioTotal.toLocaleString("es-CO")}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
