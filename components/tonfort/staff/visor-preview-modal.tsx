"use client"

import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LandingVisor } from "@/components/tonfort/landing-visor"
import type { AnimacionVisor } from "@/lib/supabase/types"
interface VisorPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  videoGlobalUrl: string | null
  frameCentroMs: number | null
  animaciones: AnimacionVisor[]
}

// Muestra el visor con el mismo componente y formato de la página pública,
// para verificar en el admin exactamente lo que verá el visitante.
export function VisorPreviewModal({
  open,
  onOpenChange,
  titulo,
  videoGlobalUrl,
  frameCentroMs,
  animaciones,
}: VisorPreviewModalProps) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-hidden border-border bg-black p-0 sm:max-w-6xl">
        <DialogHeader className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-5 py-4">
          <DialogTitle className="pr-8 text-base text-white">{titulo}</DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Así se verá en la página pública del proyecto (mismo visor de la landing).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[92vh] overflow-y-auto">
          {videoGlobalUrl ? (
            <LandingVisor
              videoGlobalUrl={videoGlobalUrl}
              frameCentroMs={frameCentroMs ?? 0}
              animaciones={animaciones}
              eyebrow="Visor 3D"
              titulo={titulo}
              descripcion={null}
            />
          ) : (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}