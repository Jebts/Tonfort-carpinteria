"use client"

import { useEffect, useState } from "react"
import { Video, Loader2, Check, Box } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PropuestaPickerItem {
  id: string
  titulo: string
  estado: string
  video_global_url: string | null
  producto: { id: string; titulo: string } | null
}

interface PropuestasPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  proyectoNombre: string
  /** IDs de propuestas ya agregadas como visor: se muestran deshabilitadas. */
  yaAgregadas: string[]
  onConfirm: (propuestaIds: string[]) => void | Promise<void>
}

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  lista: "Lista",
  enviada: "Enviada",
}

// Selector de propuestas del diseñador para mostrarlas como visores 3D del
// proyecto. Se pueden elegir varias: cada una se renderiza con el mismo formato
// de la landing.
export function PropuestasPicker({
  open,
  onOpenChange,
  proyectoId,
  proyectoNombre,
  yaAgregadas,
  onConfirm,
}: PropuestasPickerProps) {
  const [propuestas, setPropuestas] = useState<PropuestaPickerItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) {
      setSeleccionadas([])
      return
    }
    const cargar = async () => {
      setCargando(true)
      try {
        const res = await fetch(`/api/staff/administracion/portafolio/proyectos/${proyectoId}/propuestas`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error("Error al cargar propuestas")
        const data = await res.json()
        setPropuestas(data.propuestas ?? [])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar propuestas")
      } finally {
        setCargando(false)
      }
    }
    void cargar()
  }, [open, proyectoId])

  const toggle = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleConfirm = async () => {
    if (seleccionadas.length === 0) return
    setGuardando(true)
    try {
      await onConfirm(seleccionadas)
      onOpenChange(false)
    } finally {
      setGuardando(false)
    }
  }

  const elegibles = propuestas.filter((p) => !yaAgregadas.includes(p.id))
  const sinVideo = propuestas.filter((p) => !p.video_global_url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" /> Agregar visores 3D
          </DialogTitle>
          <DialogDescription>
            Elige las propuestas de <span className="font-medium text-foreground">{proyectoNombre}</span> que
            quieres mostrar en el portafolio. Se pueden agregar varias, en cualquier orden.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {cargando ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : propuestas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Box className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Este proyecto aún no tiene propuestas. El diseñador debe crearlas primero en su panel.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {propuestas.map((propuesta) => {
                const yaAgregada = yaAgregadas.includes(propuesta.id)
                const sinVideoCargado = !propuesta.video_global_url
                const deshabilitada = yaAgregada || sinVideoCargado
                const seleccionada = seleccionadas.includes(propuesta.id)

                return (
                  <button
                    key={propuesta.id}
                    type="button"
                    disabled={deshabilitada}
                    onClick={() => toggle(propuesta.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      deshabilitada
                        ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                        : "cursor-pointer border-border hover:bg-accent",
                      seleccionada && "border-primary bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                        seleccionada ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {seleccionada ? <Check className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{propuesta.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {propuesta.producto?.titulo ?? "Sin producto"}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          propuesta.estado === "enviada" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          propuesta.estado === "lista" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          propuesta.estado === "borrador" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {ETIQUETA_ESTADO[propuesta.estado] ?? propuesta.estado}
                      </span>
                      {yaAgregada && (
                        <span className="text-xs text-muted-foreground">Ya agregada</span>
                      )}
                      {sinVideoCargado && !yaAgregada && (
                        <span className="text-xs text-amber-500">Sin video</span>
                      )}
                    </div>
                  </button>
                )
              })}
              {elegibles.length === 0 && propuestas.length > 0 && (
                <p className="px-1 pt-1 text-xs text-muted-foreground">
                  Todas las propuestas disponibles ya están agregadas.
                </p>
              )}
              {sinVideo.length > 0 && (
                <p className="px-1 pt-1 text-xs text-muted-foreground">
                  Las propuestas sin video no se pueden mostrar como visor.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {seleccionadas.length > 0 ? `${seleccionadas.length} seleccionada(s)` : "Nada seleccionado"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={guardando || seleccionadas.length === 0}>
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agregando…
                </>
              ) : (
                "Agregar al portafolio"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}