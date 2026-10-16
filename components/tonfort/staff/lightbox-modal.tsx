"use client"

import { useEffect, useState } from "react"
import { X, Maximize2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface LightboxModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string | null
  alt?: string | null
  titulo?: string | null
  descripcion?: string
}

// Previsualización a tamaño real para analizar la imagen (nitidez, encuadre,
// pixelado) tal como se vería en la portada o galería pública.
export function LightboxModal({
  open,
  onOpenChange,
  src,
  alt,
  titulo,
  descripcion = "Previsualización a tamaño completo. Úsala para revisar nitidez y encuadre antes de publicar.",
}: LightboxModalProps) {
  const [dimensiones, setDimensiones] = useState<{ w: number; h: number } | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!open || !src) {
      setDimensiones(null)
      setCargando(true)
      return
    }
    setCargando(true)
    setDimensiones(null)
    const img = new window.Image()
    img.onload = () => setDimensiones({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => setDimensiones(null)
    img.src = src
  }, [open, src])

  if (!open || !src) return null

  const altoReal = dimensiones ? Math.round((dimensiones.h / dimensiones.w) * 100) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-hidden border-border bg-background p-0 sm:max-w-5xl">
        <DialogHeader className="flex-shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 pr-8 text-base">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            {titulo || alt || "Previsualización"}
          </DialogTitle>
          <DialogDescription className="text-xs">{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/80 p-4">
          <img
            src={src}
            alt={alt ?? ""}
            className={cn(
              "max-h-[70vh] max-w-full rounded-lg object-contain transition-opacity",
              cargando && "opacity-0"
            )}
            onLoad={() => setCargando(false)}
          />
          {cargando && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {dimensiones ? (
              <span>
                {dimensiones.w} × {dimensiones.h} px
                {altoReal !== null && dimensiones.w < 1200 && (
                  <span className="ml-2 text-amber-500">
                    · por debajo de 1200 px de ancho, puede pixelarse en portada
                  </span>
                )}
              </span>
            ) : (
              <span>Leyendo dimensiones…</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}