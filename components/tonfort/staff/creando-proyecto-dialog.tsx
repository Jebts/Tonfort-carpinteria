"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategoriaMueble, SedeTaller } from "@/lib/supabase/types"
import {
  CATEGORIAS_MUEBLE,
  ETIQUETA_CATEGORIA,
  SEDES,
} from "@/lib/supabase/types"
import { AIAssistButton } from "@/components/tonfort/ai-assist-button"

const SIN_CATEGORIA = "sin_categoria"

const SEDE_LABELS: Record<SedeTaller, string> = {
  santa_marta: "Santa Marta — Con visor 3D interactivo",
  bogota: "Bogotá — Solo galería de fotos (histórico)",
}

export function CreandoProyectoDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [cargando, setCargando] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [sede, setSede] = useState<SedeTaller>("santa_marta")
  const [categoria, setCategoria] = useState<CategoriaMueble | null>(null)
  const [orden, setOrden] = useState("0")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error("Título es requerido")
      return
    }

    setCargando(true)
    try {
      const res = await fetch("/api/staff/administracion/portafolio/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          sede,
          categoria,
          orden: Number(orden) || 0,
        }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al crear proyecto")
      }

      toast.success("Proyecto creado")
      onSuccess()
      onOpenChange(false)
      setTitulo("")
      setDescripcion("")
      setSede("santa_marta")
      setCategoria(null)
      setOrden("0")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear proyecto")
    } finally {
      setCargando(false)
    }
  }

  const getContexto = () => ({
    titulo,
    descripcion,
    sede,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nuevo proyecto de portafolio</DialogTitle>
          <DialogDescription>
            Define la sede para determinar si el proyecto tendrá visor 3D (Santa Marta) o solo galería (Bogotá).
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cp-titulo">Título del proyecto</Label>
                <AIAssistButton campo="Título" getContexto={getContexto} onSugerencia={setTitulo} />
              </div>
              <Input
                id="cp-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Cocina Minimalista Prado"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cp-descripcion">Descripción comercial</Label>
                <AIAssistButton campo="Descripción" getContexto={getContexto} onSugerencia={setDescripcion} />
              </div>
              <Textarea
                id="cp-descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve reseña del proyecto, materiales destacados e intención de diseño."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-sede">Sede</Label>
              <Select value={sede} onValueChange={(v) => setSede(v as SedeTaller)}>
                <SelectTrigger id="cp-sede" className="w-full">
                  <SelectValue placeholder="Elige la sede" />
                </SelectTrigger>
                <SelectContent>
                  {SEDES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {SEDE_LABELS[s.value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Santa Marta = visor 3D interactivo. Bogotá = solo galería de fotos (histórico).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cp-categoria">Categoría de mueble</Label>
                <Select
                  value={categoria ?? SIN_CATEGORIA}
                  onValueChange={(v) => setCategoria(v === SIN_CATEGORIA ? null : (v as CategoriaMueble))}
                >
                  <SelectTrigger id="cp-categoria" className="w-full">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
                    {CATEGORIAS_MUEBLE.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {ETIQUETA_CATEGORIA[c.value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Una sola categoría por proyecto. Sin categoría no aparece en los filtros.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp-orden">Orden</Label>
                <Input
                  id="cp-orden"
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Posición de ordenamiento (0 primero).</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={cargando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={cargando}>
                {cargando ? "Creando..." : "Crear proyecto"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}