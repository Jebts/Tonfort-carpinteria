"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Folder, FileText, ArrowLeft, Save, ExternalLink, Check, X, Loader2, Trash2 } from "lucide-react"
import type { CotizacionConDetalles, CotizacionPropuesta, CotizacionProducto } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

export function CotizacionDetalle({ cotizacionId }: { cotizacionId: string }) {
  const [cotizacion, setCotizacion] = useState<CotizacionConDetalles | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const cargarCotizacion = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request<{ cotizacion: CotizacionConDetalles }>(
        `/api/staff/administracion/cotizaciones/${cotizacionId}`,
      )
      setCotizacion(data.cotizacion)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cotización")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargarCotizacion()
  }, [cotizacionId])

  const handlePrecioChange = async (cotizacionPropuestaId: string, valor: string) => {
    const precio = Number(valor) >= 0 ? Number(valor) : 0
    try {
      await request(`/api/staff/administracion/cotizaciones/${cotizacionId}/precio`, {
        method: "PATCH",
        body: JSON.stringify({ cotizacion_propuesta_id: cotizacionPropuestaId, precio }),
      })
      await cargarCotizacion()
      setMensaje("Precio actualizado")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar precio")
    }
  }

  const handleSeleccionChange = async (cotizacionPropuestaId: string, seleccionada: boolean) => {
    try {
      await request(`/api/staff/administracion/cotizaciones/${cotizacionId}/seleccion`, {
        method: "PATCH",
        body: JSON.stringify({ cotizacion_propuesta_id: cotizacionPropuestaId, seleccionada }),
      })
      await cargarCotizacion()
      setMensaje("Selección actualizada")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar selección")
    }
  }

  const handleEliminarProducto = async (cotizacionProductoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto de la cotización?")) return
    
    try {
      await request(`/api/staff/administracion/cotizaciones/${cotizacionId}/productos/${cotizacionProductoId}`, {
        method: "DELETE",
      })
      await cargarCotizacion()
      setMensaje("Producto eliminado")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar producto")
    }
  }

  const handleEliminarPropuesta = async (cotizacionPropuestaId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta propuesta de la cotización?")) return
    
    try {
      await request(`/api/staff/administracion/cotizaciones/${cotizacionId}/propuestas/${cotizacionPropuestaId}`, {
        method: "DELETE",
      })
      await cargarCotizacion()
      setMensaje("Propuesta eliminada")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar propuesta")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cotización...
        </div>
      </div>
    )
  }

  if (!cotizacion) {
    return (
      <div className="py-12 text-center text-white/60">
        <p>{error ?? "Cotización no encontrada"}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/staff/administracion/cotizaciones">
          <Button variant="ghost" size="icon" className="text-white hover:bg-[#27272a]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {cotizacion.proyectos.titulo || "Proyecto sin nombre"}
          </h1>
          <p className="text-sm text-white/60">
            Cliente: {cotizacion.proyectos.clientes.nombre || "N/A"}
          </p>
        </div>
      </div>

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

      <div className="rounded-xl bg-[#121214] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Productos y Propuestas</h2>
        </div>

        <p className="mb-4 text-sm text-white/60">
          Manipula libremente los productos y propuestas de esta cotización. Los cambios no afectan al proyecto original.
        </p>

        <div className="space-y-4">
          {cotizacion.proyectos.cotizacion_productos.length === 0 ? (
            <div className="py-8 text-center text-white/60">No hay productos en esta cotización</div>
          ) : (
            cotizacion.proyectos.cotizacion_productos.map((producto) => (
              <div key={producto.id} className="rounded-lg border border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-white/60" />
                    <span className="font-medium text-white">{producto.titulo}</span>
                    <span className="text-sm text-white/40">
                      ({producto.cotizacion_propuestas.length} propuesta{producto.cotizacion_propuestas.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                    onClick={() => handleEliminarProducto(producto.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="ml-7 space-y-2">
                  {producto.cotizacion_propuestas.length === 0 ? (
                    <p className="text-sm text-white/40">No hay propuestas</p>
                  ) : (
                    producto.cotizacion_propuestas.map((propuesta) => (
                      <div
                        key={propuesta.id}
                        className="flex items-center gap-2 rounded-lg bg-[#18181b] p-3 transition-colors hover:bg-[#27272a]"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-white/60" />
                        <span className="flex-1 text-sm text-white">{propuesta.titulo}</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Precio"
                          defaultValue={propuesta.precio_cotizacion ?? ""}
                          onBlur={(e) => handlePrecioChange(propuesta.id, e.target.value)}
                          className="h-8 w-24 bg-[#27272a] text-xs text-white"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white/60 hover:text-white"
                          onClick={() => handleSeleccionChange(propuesta.id, !propuesta.seleccionada_por_cliente)}
                          aria-label={propuesta.seleccionada_por_cliente ? "Quitar selección" : "Marcar selección"}
                        >
                          {propuesta.seleccionada_por_cliente ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                          onClick={() => handleEliminarPropuesta(propuesta.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
          <div className="text-sm text-white/60">
            Link de cotización: <span className="font-mono">/cotizaciones/{cotizacion.token}</span>
          </div>
          <Link href={`/cotizaciones/${cotizacion.token}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-[#27272a]">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver vista cliente
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
