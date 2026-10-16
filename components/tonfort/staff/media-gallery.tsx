"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Plus, Image as ImageIcon, Video, X, GripVertical, Eye, EyeOff, Trash2, LayoutDashboard, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LightboxModal } from "./lightbox-modal"
import { VisorPreviewModal } from "./visor-preview-modal"
import type { MediaDragPayload } from "@/hooks/use-portafolio-proyectos"
import type { AnimacionVisor, ProyectoConMedia } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

const IMAGEN_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif"]

interface MediaGalleryProps {
  proyecto: ProyectoConMedia
  onSubirArchivos: (files: File[], tipo: "galeria" | "portada") => void
  onEliminarFoto: (fotoId: string) => void
  onReordenarFotos: (idsEnOrden: string[]) => void
  onPortadaChange: (url: string | null) => void
  onEliminarVisor: (visorId: string) => void
  onToggleVisorActivo: (visorId: string) => void
  onReordenarVisores: (idsEnOrden: string[]) => void
  onAgregarVisor: () => void
  onDragStartMedia: (payload: MediaDragPayload) => void
  onDragEndMedia: () => void
  arrastrando: boolean
}

export function MediaGallery({
  proyecto,
  onSubirArchivos,
  onEliminarFoto,
  onReordenarFotos,
  onPortadaChange,
  onEliminarVisor,
  onToggleVisorActivo,
  onReordenarVisores,
  onAgregarVisor,
  onDragStartMedia,
  onDragEndMedia,
  arrastrando,
}: MediaGalleryProps) {
  const fotos = proyecto.fotos ?? []
  const visores = proyecto.visores ?? []
  const fileInputGaleriaRef = useRef<HTMLInputElement>(null)
  const fileInputPortadaRef = useRef<HTMLInputElement>(null)
  const mouseYRef = useRef(0)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll de la página mientras se arrastra una imagen cerca del borde.
  useEffect(() => {
    const onWindowDragOver = (e: DragEvent) => {
      mouseYRef.current = e.clientY
    }
    const pararScroll = () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }
    window.addEventListener("dragover", onWindowDragOver)
    window.addEventListener("dragend", pararScroll)
    return () => {
      window.removeEventListener("dragover", onWindowDragOver)
      window.removeEventListener("dragend", pararScroll)
    }
  }, [])

  // Lightbox
  const [lightbox, setLightbox] = useState<{ src: string; alt: string | null; titulo: string | null } | null>(null)

  // Preview de visor con el formato de la landing
  const [previewVisorId, setPreviewVisorId] = useState<string | null>(null)
  const visorPreview = visores.find((v) => v.id === previewVisorId) ?? null

  // Reordenamiento interno (galería y visores)
  const [fotoArrastrada, setFotoArrastrada] = useState<string | null>(null)
  const [fotoSobre, setFotoSobre] = useState<string | null>(null)
  const [visorArrastrado, setVisorArrastrado] = useState<string | null>(null)
  const [visorSobre, setVisorSobre] = useState<string | null>(null)

  const handleFiles = useCallback(
    (files: File[], tipo: "galeria" | "portada") => {
      if (files.length > 0) onSubirArchivos(files, tipo)
    },
    [onSubirArchivos],
  )

  // Dropzone solo del tile "añadir" de la galería.
  const { getRootProps: getGaleriaRootProps, getInputProps: getGaleriaInputProps, isDragActive: galeriaDragActive } = useDropzone({
    onDrop: (files) => handleFiles(files, "galeria"),
    accept: { "image/*": IMAGEN_EXT },
    multiple: true,
    noClick: true,
    noKeyboard: true,
  })

  const iniciarDragFoto = (e: React.DragEvent, fotoId: string, preview: string, titulo: string) => {
    setFotoArrastrada(fotoId)
    // Obligatorio en Firefox para que el drag arranque.
    e.dataTransfer.setData("text/plain", fotoId)
    e.dataTransfer.effectAllowed = "copyMove"
    onDragStartMedia({
      items: [{ tipo: "foto", id: fotoId, preview, titulo }],
      origenProyectoId: proyecto.id,
    })
    // Auto-scroll si el cursor está cerca del borde superior/inferior.
    scrollIntervalRef.current = setInterval(() => {
      const y = mouseYRef.current
      const innerHeight = window.innerHeight
      if (y < 90) window.scrollBy(0, -24)
      else if (y > innerHeight - 90) window.scrollBy(0, 24)
    }, 40)
  }

  const soltarSobreFoto = (e: React.DragEvent, fotoDestinoId: string) => {
    e.preventDefault()
    // Si el arrastre no nació en esta galería viene de OTRO proyecto: se deja
    // que el drop llegue a la tarjeta, que abre el modal Mover/Copiar.
    if (!fotoArrastrada || fotoArrastrada === fotoDestinoId) return
    e.stopPropagation()
    const ids = fotos.map((f) => f.id)
    const desde = ids.indexOf(fotoArrastrada)
    ids.splice(desde, 1)
    ids.splice(ids.indexOf(fotoDestinoId), 0, fotoArrastrada)
    onReordenarFotos(ids)
    setFotoArrastrada(null)
    setFotoSobre(null)
  }

  const iniciarDragVisor = (e: React.DragEvent, visorId: string, preview: string, titulo: string) => {
    setVisorArrastrado(visorId)
    e.dataTransfer.setData("text/plain", visorId)
    e.dataTransfer.effectAllowed = "copyMove"
    onDragStartMedia({
      items: [{ tipo: "visor", id: visorId, preview, titulo }],
      origenProyectoId: proyecto.id,
    })
  }

  const soltarSobreVisor = (e: React.DragEvent, visorDestinoId: string) => {
    e.preventDefault()
    // Igual que con las fotos: solo se intercepta el reordenamiento interno.
    if (!visorArrastrado || visorArrastrado === visorDestinoId) return
    e.stopPropagation()
    const ids = visores.map((v) => v.id)
    const desde = ids.indexOf(visorArrastrado)
    ids.splice(desde, 1)
    ids.splice(ids.indexOf(visorDestinoId), 0, visorArrastrado)
    onReordenarVisores(ids)
    setVisorArrastrado(null)
    setVisorSobre(null)
  }

  return (
    <div className="space-y-7">
      {/* Portada */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" /> Portada
        </h4>
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="relative group w-full max-w-sm"
            draggable={!!proyecto.portada_url}
            onDragStart={(e) => {
              if (!proyecto.portada_url) return
              e.dataTransfer.setData("text/plain", "portada")
              e.dataTransfer.effectAllowed = "copyMove"
              onDragStartMedia({
                items: [{ tipo: "portada", id: proyecto.id, preview: proyecto.portada_url, titulo: `Portada de ${proyecto.titulo}` }],
                origenProyectoId: proyecto.id,
              })
            }}
            onDragEnd={onDragEndMedia}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const files = Array.from(e.dataTransfer.files)
              if (files.length > 0) handleFiles(files.slice(0, 1), "portada")
            }}
          >
            {proyecto.portada_url ? (
              <>
                <img
                  src={proyecto.portada_url}
                  alt={`Portada de ${proyecto.titulo}`}
                  className="h-40 w-full cursor-zoom-in rounded-lg border border-border object-cover"
                  draggable={false}
                  onClick={() =>
                    setLightbox({
                      src: proyecto.portada_url as string,
                      alt: `Portada de ${proyecto.titulo}`,
                      titulo: `Portada — ${proyecto.titulo}`,
                    })
                  }
                />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-background/80"
                    title="Previsualizar"
                    onClick={() =>
                      setLightbox({
                        src: proyecto.portada_url as string,
                        alt: `Portada de ${proyecto.titulo}`,
                        titulo: `Portada — ${proyecto.titulo}`,
                      })
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-background/80 text-destructive"
                    title="Quitar portada"
                    onClick={() => onPortadaChange(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">Portada</span>
              </>
            ) : (
              <div
                className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50"
                onClick={() => fileInputPortadaRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const files = Array.from(e.dataTransfer.files)
                  if (files.length > 0) handleFiles(files.slice(0, 1), "portada")
                }}
              >
                <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Sin portada</p>
                <p className="text-xs text-muted-foreground/70">Click, arrastra o pega una imagen</p>
              </div>
            )}
            <input
              ref={fileInputPortadaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length > 0) handleFiles(files.slice(0, 1), "portada")
                e.target.value = ""
              }}
            />
          </div>
          <div className="flex-1 space-y-2 text-xs text-muted-foreground">
            <p>
              La portada es la imagen a sangre completa de la página pública. Click en la imagen para
              previsualizarla a tamaño real y revisar su nitidez.
            </p>
            {proyecto.portada_url && (
              <Button variant="outline" size="sm" onClick={() => fileInputPortadaRef.current?.click()}>
                <Upload className="mr-2 h-3.5 w-3.5" /> Reemplazar portada
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Galería de fotos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ImageIcon className="h-4 w-4" /> Galería ({fotos.length})
          </h4>
          <p className="text-xs text-muted-foreground">Arrastra una foto sobre otra para reordenar · suelta en otro proyecto para moverla</p>
        </div>
        <div
          className={cn(
            "grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
            galeriaDragActive && "rounded-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-card"
          )}
          onDragOver={(e) => {
            // Solo archivos del escritorio: los thumbs internos llevan texto.
            if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault()
          }}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files)
            if (files.length === 0) return
            e.preventDefault()
            handleFiles(files, "galeria")
          }}
        >
          {fotos.map((foto, index) => (
            <div
              key={foto.id}
              draggable
              onDragStart={(e) => iniciarDragFoto(e, foto.id, foto.url, foto.alt ?? `Foto ${index + 1}`)}
              onDragEnd={() => {
                setFotoArrastrada(null)
                setFotoSobre(null)
                onDragEndMedia()
                if (scrollIntervalRef.current) {
                  clearInterval(scrollIntervalRef.current)
                  scrollIntervalRef.current = null
                }
              }}
              onDragOver={(e) => {
                if (!fotoArrastrada) return
                e.preventDefault()
                e.stopPropagation()
                setFotoSobre(foto.id)
              }}
              onDragLeave={() => setFotoSobre((prev) => (prev === foto.id ? null : prev))}
              onDrop={(e) => soltarSobreFoto(e, foto.id)}
              className={cn(
                "group relative h-24 cursor-grab overflow-hidden rounded-lg border transition-colors active:cursor-grabbing",
                fotoArrastrada === foto.id && "opacity-40",
                fotoSobre === foto.id && fotoArrastrada !== foto.id && "border-primary ring-2 ring-primary/40",
                !fotoArrastrada && "border-border hover:border-primary/50"
              )}
            >
              <img
                src={foto.url}
                alt={foto.alt ?? ""}
                draggable={false}
                className="h-full w-full cursor-zoom-in object-cover"
                onClick={() => setLightbox({ src: foto.url, alt: foto.alt, titulo: foto.alt ?? `Foto ${index + 1}` })}
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {index + 1}
              </span>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 bg-background/80 text-destructive"
                  title="Eliminar foto"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEliminarFoto(foto.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {fotoArrastrada && (
                <GripVertical className="absolute bottom-1 right-1 h-4 w-4 text-white/70" />
              )}
            </div>
          ))}

          {/* Tile de subida / drop */}
          <div
            {...getGaleriaRootProps()}
            className={cn(
              "flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50",
              galeriaDragActive && "border-primary bg-primary/5"
            )}
            onClick={() => fileInputGaleriaRef.current?.click()}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.items)
                .filter((item) => item.kind === "file")
                .map((item) => item.getAsFile())
                .filter((f): f is File => f !== null)
              if (files.length > 0) handleFiles(files, "galeria")
            }}
          >
            <input {...getGaleriaInputProps()} />
            <Plus className="h-7 w-7 text-muted-foreground/50" />
            <p className="mt-1 text-xs text-muted-foreground">Añadir</p>
            <p className="text-[10px] text-muted-foreground/70">Click, arrastra o pega</p>
          </div>
          <input
            ref={fileInputGaleriaRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length > 0) handleFiles(files, "galeria")
              e.target.value = ""
            }}
          />
        </div>
      </div>

      {/* Visores 3D — solo Santa Marta, elegidos desde propuestas */}
      {proyecto.sede === "santa_marta" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Video className="h-4 w-4" /> Visores 3D ({visores.length})
            </h4>
            <Button variant="outline" size="sm" onClick={onAgregarVisor}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Agregar visor
            </Button>
          </div>

          {visores.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 px-4 py-8 text-center transition-colors",
                arrastrando && "border-primary bg-primary/5"
              )}
            >
              <Video className="h-9 w-9 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Sin visores 3D</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Agrégalos desde las propuestas del diseñador. Se muestran con el mismo formato de la landing.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onAgregarVisor}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Agregar visor
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">Arrastra un visor sobre otro para reordenar · suelta en otro proyecto para moverlo o copiarlo</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visores.map((visor, index) => (
                  <div
                    key={visor.id}
                    draggable
                    onDragStart={(e) =>
                      iniciarDragVisor(
                        e,
                        visor.id,
                        visor.propuesta?.video_global_url ?? "",
                        visor.propuesta?.titulo ?? `Visor ${index + 1}`
                      )
                    }
                    onDragEnd={() => {
                      setVisorArrastrado(null)
                      setVisorSobre(null)
                      onDragEndMedia()
                    }}
                    onDragOver={(e) => {
                      if (!visorArrastrado) return
                      e.preventDefault()
                      e.stopPropagation()
                      setVisorSobre(visor.id)
                    }}
                    onDragLeave={() => setVisorSobre((prev) => (prev === visor.id ? null : prev))}
                    onDrop={(e) => soltarSobreVisor(e, visor.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border border-border bg-card transition-colors",
                      visorArrastrado === visor.id && "opacity-40",
                      visorSobre === visor.id && visorArrastrado !== visor.id && "border-primary ring-2 ring-primary/40",
                      !visor.activo && "opacity-60"
                    )}
                  >
                    <div className="relative h-28 bg-black">
                      {visor.propuesta?.video_global_url ? (
                        <video
                          src={visor.propuesta.video_global_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/50">Sin video</div>
                      )}
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {index + 1}
                      </span>
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 bg-background/80"
                          title={visor.activo ? "Ocultar del portafolio" : "Mostrar en el portafolio"}
                          onClick={() => onToggleVisorActivo(visor.id)}
                        >
                          {visor.activo ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 bg-background/80 text-destructive"
                          title="Quitar del portafolio"
                          onClick={() => onEliminarVisor(visor.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {visor.propuesta?.titulo ?? "Propuesta eliminada"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {visor.propuesta?.producto?.titulo ?? "—"}
                          {!visor.activo && " · oculto"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={() => setPreviewVisorId(visor.id)}
                        disabled={!visor.propuesta?.video_global_url}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver
                      </Button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={onAgregarVisor}
                  className="flex h-full min-h-[8.5rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-4 text-center transition-colors hover:border-primary/50"
                >
                  <Plus className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">Agregar otro visor</p>
                  <p className="text-xs text-muted-foreground/70">Desde propuestas del diseñador</p>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <LightboxModal
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
        src={lightbox?.src ?? null}
        alt={lightbox?.alt}
        titulo={lightbox?.titulo}
      />

      <VisorPreviewModal
        open={!!visorPreview}
        onOpenChange={(open) => !open && setPreviewVisorId(null)}
        titulo={visorPreview?.propuesta?.titulo ?? "Visor 3D"}
        videoGlobalUrl={visorPreview?.propuesta?.video_global_url ?? null}
        frameCentroMs={visorPreview?.propuesta?.frame_centro_ms ?? null}
        animaciones={(visorPreview?.propuesta?.animaciones ?? []) as AnimacionVisor[]}
      />
    </div>
  )
}