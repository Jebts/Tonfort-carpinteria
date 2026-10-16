import { useState } from "react"
import { Move, Copy, X, Image, Video, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Accion = "mover" | "copiar"

interface MediaItem {
  tipo: "foto" | "visor" | "portada"
  id: string
  preview?: string
  titulo?: string
}

interface MoveCopyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MediaItem[]
  origenProyectoId: string
  destinoProyectoId: string
  onConfirm: (accion: Accion) => void
}

export function MoveCopyModal({
  open,
  onOpenChange,
  items,
  onConfirm,
}: MoveCopyModalProps) {
  const [accion, setAccion] = useState<Accion>("mover")

  const handleConfirm = () => {
    onConfirm(accion)
    onOpenChange(false)
    setAccion("mover")
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "foto": return <Image className="h-4 w-4" />
      case "visor": return <Video className="h-4 w-4" />
      case "portada": return <LayoutDashboard className="h-4 w-4" />
      default: return <Image className="h-4 w-4" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "foto": return "Foto de galería"
      case "visor": return "Visor 3D"
      case "portada": return "Imagen de portada"
      default: return tipo
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" /> Mover o copiar contenido
          </DialogTitle>
          <DialogDescription>
            Se detectaron {items.length} elemento(s) arrastrados a otro proyecto.
            ¿Qué deseas hacer?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2 max-h-60 overflow-y-auto">
          {items.map((item, index) => (
            <div key={`${item.tipo}-${item.id}-${index}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {item.preview && (
                item.tipo === "visor" ? (
                  <video
                    src={item.preview}
                    className="h-12 w-12 rounded object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.preview}
                    alt={item.titulo ?? ""}
                    className="h-12 w-12 rounded object-cover"
                  />
                )
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getTipoIcon(item.tipo)}
                  <span className="font-medium truncate">{item.titulo ?? `Item ${index + 1}`}</span>
                </div>
                <p className="text-xs text-muted-foreground">{getTipoLabel(item.tipo)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label className="flex items-center gap-2 cursor-pointer">
            <RadioGroup value={accion} onValueChange={(v) => setAccion(v as Accion)}>
              <RadioGroupItem value="mover" />
            </RadioGroup>
            <Move className="h-4 w-4 text-primary" />
            <span className="font-medium">Mover</span>
            <p className="text-xs text-muted-foreground ml-6">
              Elimina el contenido del proyecto origen y lo pasa al destino.
            </p>
          </Label>

          <Label className="flex items-center gap-2 cursor-pointer">
            <RadioGroup value={accion} onValueChange={(v) => setAccion(v as Accion)}>
              <RadioGroupItem value="copiar" />
            </RadioGroup>
            <Copy className="h-4 w-4 text-primary" />
            <span className="font-medium">Copiar</span>
            <p className="text-xs text-muted-foreground ml-6">
              Duplica el contenido en el proyecto destino (el origen se mantiene).
            </p>
          </Label>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleConfirm} className={cn(accion === "mover" && "bg-destructive hover:bg-destructive/90")}>
            {accion === "mover" ? (
              <> <Move className="mr-2 h-4 w-4" /> Mover {items.length} elemento(s) </> ) : (
              <> <Copy className="mr-2 h-4 w-4" /> Copiar {items.length} elemento(s) </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}