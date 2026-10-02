"use client"

import { useState, useEffect } from "react"
import { X, Folder, Building } from "lucide-react"
import { getProyectos, getClientes } from "@/lib/staff-client"
import type { Proyecto, Cliente } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface CrearCotizacionModalProps {
  onClose: () => void
  onCrear: (proyectoId: string, clienteId: string) => void
}

export function CrearCotizacionModal({ onClose, onCrear }: CrearCotizacionModalProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [proyectosData, clientesData] = await Promise.all([
        getProyectos(),
        getClientes(),
      ])
      setProyectos(proyectosData || [])
      setClientes(clientesData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCrear = async () => {
    if (!proyectoSeleccionado || !clienteSeleccionado) return

    setCreando(true)
    try {
      await onCrear(proyectoSeleccionado, clienteSeleccionado)
      onClose()
    } catch (error) {
      console.error("Error al crear cotización:", error)
    } finally {
      setCreando(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#121214] rounded-2xl p-6 w-full max-w-md">
          <p className="text-white/60">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121214] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Nueva Cotización</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#27272a] text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Proyecto</Label>
            <select
              value={proyectoSeleccionado}
              onChange={(e) => setProyectoSeleccionado(e.target.value)}
              className="w-full bg-[#27272a] text-white rounded-lg px-4 py-3 outline-none border border-white/10 focus:border-white/30"
            >
              <option value="">Seleccionar proyecto</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id} className="bg-[#18181b]">
                  {proyecto.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Cliente</Label>
            <select
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
              className="w-full bg-[#27272a] text-white rounded-lg px-4 py-3 outline-none border border-white/10 focus:border-white/30"
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id} className="bg-[#18181b]">
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-[#27272a]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCrear}
              disabled={!proyectoSeleccionado || !clienteSeleccionado || creando}
              className="flex-1 bg-[#E8DFD0] text-[#0B1D3A] hover:bg-[#d4d3c0]"
            >
              {creando ? "Creando..." : "Crear Cotización"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
