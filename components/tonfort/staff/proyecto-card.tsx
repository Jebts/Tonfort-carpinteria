"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, GripVertical, Loader2, Undo2, Video, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MediaGallery } from "./media-gallery"
import { MoveCopyModal } from "./move-copy-modal"
import { PropuestasPicker } from "./propuestas-picker"
import { useDebounce } from "@/hooks/use-debounce"
import type { MediaDragPayload } from "@/hooks/use-portafolio-proyectos"
import type { ProyectoConMedia } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

interface ProyectoCardProps {
  proyecto: ProyectoConMedia
  index: number
  onGuardar: (id: string, campos: Partial<ProyectoConMedia>) => void
  onEliminar: (id: string) => void
  onSubirArchivos: (proyectoId: string, files: File[], tipo: "galeria" | "portada") => void
  onEliminarFoto: (proyectoId: string, fotoId: string) => void
  onReordenarFotos: (proyectoId: string, idsEnOrden: string[]) => void
  onPortadaChange: (proyectoId: string, url: string | null) => void
  onEliminarVisor: (proyectoId: string, visorId: string) => void
  onToggleVisorActivo: (proyectoId: string, visorId: string) => void
  onReordenarVisores: (proyectoId: string, idsEnOrden: string[]) => void
  onAgregarVisores: (proyectoId: string, propuestaIds: string[]) => void | Promise<void>
  onMoverCopiar: (payload: MediaDragPayload, destinoProyectoId: string, accion: "mover" | "copiar") => void
  arrastrando: MediaDragPayload | null
  onDragStartMedia: (payload: MediaDragPayload) => void
  onDragEndMedia: () => void
  onExpandChange?: (expandido: boolean) => void
}

export function ProyectoCard({
  proyecto,
  index,
  onGuardar,
  onEliminar,
  onSubirArchivos,
  onEliminarFoto,
  onReordenarFotos,
  onPortadaChange,
  onEliminarVisor,
  onToggleVisorActivo,
  onReordenarVisores,
  onAgregarVisores,
  onMoverCopiar,
  arrastrando,
  onDragStartMedia,
  onDragEndMedia,
  onExpandChange,
}: ProyectoCardProps) {
  const [expandido, setExpandido] = useState(false)
  const [tituloLocal, setTituloLocal] = useState(proyecto.titulo)
  const [descripcionLocal, setDescripcionLocal] = useState(proyecto.descripcion ?? "")
  const [guardando, setGuardando] = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState(false)
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [resaltado, setResaltado] = useState(false)
  const [modalMoveCopy, setModalMoveCopy] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  // Espejo de `cambiosPendientes` para que el efecto de sincronización pueda
  // consultarlo sin depender de él.
  const cambiosPendientesRef = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: proyecto.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Sincroniza solo cuando NO hay edición en curso: si el usuario está
  // escribiendo, la respuesta del guardado (o un refresh ajeno) no debe pisar
  // el campo con un valor anterior.
  useEffect(() => {
    if (cambiosPendientesRef.current) return
    setTituloLocal(proyecto.titulo)
    setDescripcionLocal(proyecto.descripcion ?? "")
  }, [proyecto.titulo, proyecto.descripcion])

  const montadoRef = useRef(true)
  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  const guardarTitulo = useDebounce(async (valor: string) => {
    setGuardando(true)
    try {
      await onGuardar(proyecto.id, { titulo: valor })
      if (!montadoRef.current) return
      setCambiosPendientes(false)
    } finally {
      if (montadoRef.current) setGuardando(false)
    }
  }, 900)

  const guardarDescripcion = useDebounce(async (valor: string) => {
    setGuardando(true)
    try {
      await onGuardar(proyecto.id, { descripcion: valor || null })
      if (!montadoRef.current) return
      setCambiosPendientes(false)
    } finally {
      if (montadoRef.current) setGuardando(false)
    }
  }, 900)

  // Guardado inmediato con los valores actuales, sin pasar por el debounce.
  const guardarAhora = useCallback(
    async (titulo: string, descripcion: string) => {
      await onGuardar(proyecto.id, {
        titulo,
        descripcion: descripcion || null,
      })
    },
    [onGuardar, proyecto.id],
  )

  const handleTitulo = (valor: string) => {
    setTituloLocal(valor)
    setCambiosPendientes(true)
    void guardarTitulo(valor)
  }

  const handleDescripcion = (valor: string) => {
    setDescripcionLocal(valor)
    setCambiosPendientes(true)
    void guardarDescripcion(valor)
  }

  useEffect(() => {
    cambiosPendientesRef.current = cambiosPendientes
  }, [cambiosPendientes])

  // Deshacer: cancela el guardado programado, restaura y persiste el valor
  // original para que el servidor no se quede con el texto descartado.
  const deshacer = () => {
    const tituloOriginal = proyecto.titulo
    const descripcionOriginal = proyecto.descripcion ?? ""
    guardarTitulo.cancel()
    guardarDescripcion.cancel()
    setGuardando(false)
    setTituloLocal(tituloOriginal)
    setDescripcionLocal(descripcionOriginal)
    setCambiosPendientes(false)
    void guardarAhora(tituloOriginal, descripcionOriginal)
  }

  // Al desmontar se ejecuta el guardado pendiente: la última edición no se
  // pierde si el proyecto se reordenase, filtrase o la página cambiase.
  const onExpandChangeRef = useRef(onExpandChange)
  onExpandChangeRef.current = onExpandChange

  useEffect(
    () => () => {
      guardarTitulo.flush()
      guardarDescripcion.flush()
      onExpandChangeRef.current?.(false)
    },
    [guardarTitulo, guardarDescripcion],
  )

  // Arrastre de contenido desde OTRO proyecto sobre esta tarjeta.
  const dropDeOtroProyecto = arrastrando !== null && arrastrando.origenProyectoId !== proyecto.id

  const handleDragOver = (e: React.DragEvent) => {
    if (!dropDeOtroProyecto) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setResaltado(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setResaltado(false)
  }

  // Al soltar se abre el modal Mover/Copiar: la acción se ejecuta al confirmar.
  // El payload se captura aquí porque `arrastrando` (estado de la página) se
  // limpia en el `dragend` del elemento origen, justo después del `drop`.
  const [dropPendiente, setDropPendiente] = useState<MediaDragPayload | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setResaltado(false)
    if (!dropDeOtroProyecto || !arrastrando) return
    setDropPendiente(arrastrando)
    setModalMoveCopy(true)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-shadow",
        resaltado && "border-primary ring-2 ring-primary/50",
        isDragging && "z-10 opacity-50 shadow-lg"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Cabecera: siempre visible. Click en cualquier punto alterna
          despliegue; el input y los botones quedan fuera con stopPropagation. */}
      <div
        className="flex cursor-pointer items-center gap-3 border-b border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
        onClick={() => {
          const siguiente = !expandido
          setExpandido(siguiente)
          onExpandChange?.(siguiente)
        }}
      >
        {/* Manija de arrastre (solo aquí: los inputs siguen siendo seleccionables) */}
        <button
          type="button"
          className="cursor-grab touch-none rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:cursor-grabbing"
          aria-label={`Arrastrar para reordenar ${proyecto.titulo}`}
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <span className="w-6 text-right font-mono text-xs text-muted-foreground">{index + 1}</span>

        <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
          <Input
            value={tituloLocal}
            onChange={(e) => handleTitulo(e.target.value)}
            className="h-8 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
            placeholder="Título del proyecto"
            aria-label="Título del proyecto"
          />
          {proyecto.descripcion && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{proyecto.descripcion}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {proyecto.sede === "santa_marta" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Video className="mr-1 inline h-3 w-3" />
              {(proyecto.visores ?? []).length}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              proyecto.publicado
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {proyecto.publicado ? "Publicado" : "Borrador"}
          </span>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Eliminar proyecto"
            onClick={() => setConfirmarEliminar(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={() => {
              const siguiente = !expandido
              setExpandido(siguiente)
              onExpandChange?.(siguiente)
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label={expandido ? `Minimizar ${proyecto.titulo}` : `Desplegar ${proyecto.titulo}`}
            aria-expanded={expandido}
          >
            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", expandido && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Contenido desplegado */}
      {expandido && (
        <div className="space-y-6 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`titulo-${proyecto.id}`}>Título</Label>
                <div className="flex items-center gap-1">
                  {guardando && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
                    </span>
                  )}
                  {cambiosPendientes && !guardando && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={deshacer}>
                      <Undo2 className="mr-1 h-3 w-3" /> Deshacer
                    </Button>
                  )}
                </div>
              </div>
              <Input
                id={`titulo-${proyecto.id}`}
                value={tituloLocal}
                onChange={(e) => handleTitulo(e.target.value)}
                placeholder="Título del proyecto"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`descripcion-${proyecto.id}`}>Descripción</Label>
              <Textarea
                id={`descripcion-${proyecto.id}`}
                value={descripcionLocal}
                onChange={(e) => handleDescripcion(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-y"
                placeholder="Descripción del proyecto…"
              />
            </div>
          </div>

          <MediaGallery
            proyecto={proyecto}
            onSubirArchivos={(files, tipo) => onSubirArchivos(proyecto.id, files, tipo)}
            onEliminarFoto={(fotoId) => onEliminarFoto(proyecto.id, fotoId)}
            onReordenarFotos={(ids) => onReordenarFotos(proyecto.id, ids)}
            onPortadaChange={(url) => onPortadaChange(proyecto.id, url)}
            onEliminarVisor={(visorId) => onEliminarVisor(proyecto.id, visorId)}
            onToggleVisorActivo={(visorId) => onToggleVisorActivo(proyecto.id, visorId)}
            onReordenarVisores={(ids) => onReordenarVisores(proyecto.id, ids)}
            onAgregarVisor={() => setMostrarPicker(true)}
            onDragStartMedia={onDragStartMedia}
            onDragEndMedia={onDragEndMedia}
            arrastrando={arrastrando !== null}
          />
        </div>
      )}

      <PropuestasPicker
        open={mostrarPicker}
        onOpenChange={setMostrarPicker}
        proyectoId={proyecto.id}
        proyectoNombre={proyecto.titulo}
        yaAgregadas={(proyecto.visores ?? []).map((v) => v.propuesta?.id).filter((id): id is string => !!id)}
        onConfirm={async (ids) => {
          for (const id of ids) {
            await onAgregarVisores(proyecto.id, [id])
          }
        }}
      />

      <MoveCopyModal
        open={modalMoveCopy && !!dropPendiente}
        onOpenChange={(open) => {
          if (!open) {
            setModalMoveCopy(false)
            setDropPendiente(null)
          }
        }}
        items={dropPendiente?.items ?? []}
        origenProyectoId={dropPendiente?.origenProyectoId ?? ""}
        destinoProyectoId={proyecto.id}
        onConfirm={(accion) => {
          if (dropPendiente) void onMoverCopiar(dropPendiente, proyecto.id, accion)
          setModalMoveCopy(false)
        }}
      />

      <ConfirmDialog
        open={confirmarEliminar}
        title="¿Eliminar proyecto?"
        description={`Vas a eliminar "${proyecto.titulo}". Se eliminarán también sus fotos de galería y los visores configurados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          void onEliminar(proyecto.id)
          setConfirmarEliminar(false)
        }}
        onOpenChange={(open) => {
          if (!open) setConfirmarEliminar(false)
        }}
      />
    </div>
  )
}