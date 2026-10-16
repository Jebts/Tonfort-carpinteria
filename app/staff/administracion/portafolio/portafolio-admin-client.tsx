"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus, Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreandoProyectoDialog } from "@/components/tonfort/staff/creando-proyecto-dialog"
import { ProyectoCard } from "@/components/tonfort/staff/proyecto-card"
import {
  usePortafolioProyectos,
  type MediaDragPayload,
} from "@/hooks/use-portafolio-proyectos"
import type { ProyectoConMedia, SedeTaller } from "@/lib/supabase/types"

function porOrden(a: ProyectoConMedia, b: ProyectoConMedia): number {
  return a.orden - b.orden
}

interface PortafolioAdminClientProps {
  /** Datos cargados en el servidor: la página no depende de un fetch de cliente. */
  proyectosIniciales: ProyectoConMedia[]
}

export default function PortafolioAdminClient({ proyectosIniciales }: PortafolioAdminClientProps) {
  const portafolio = usePortafolioProyectos(proyectosIniciales)
  const [creando, setCreando] = useState(false)
  const [arrastrando, setArrastrando] = useState<MediaDragPayload | null>(null)
  // Proyectos desplegados, en orden de apertura. El pegado (Ctrl+V) va al
  // último que se abrió, y así hay un único handler para toda la página.
  const [desplegados, setDesplegados] = useState<string[]>([])

  // Distingue el click del arrastre: sin distancia mínima, el input de título
  // o el botón de expandir se comerían el gesto.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { proyectos, cargando } = portafolio

  // Pegado de imágenes (Ctrl+V) con el foco en cualquier campo del proyecto.
  // El destino y el handler van en refs para suscribirse una sola vez.
  const desplegadosRef = useRef(desplegados)
  desplegadosRef.current = desplegados
  const subirArchivosRef = useRef(portafolio.subirArchivos)
  subirArchivosRef.current = portafolio.subirArchivos

  useEffect(() => {
    const onPasteGlobal = (e: ClipboardEvent) => {
      const destinoId = desplegadosRef.current[desplegadosRef.current.length - 1]
      if (!destinoId) return
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length === 0) return
      e.preventDefault()
      void subirArchivosRef.current(destinoId, files, "galeria")
    }
    document.addEventListener("paste", onPasteGlobal)
    return () => document.removeEventListener("paste", onPasteGlobal)
  }, [])

  const santaMarta = useMemo(
    () => proyectos.filter((p) => p.sede === "santa_marta").sort(porOrden),
    [proyectos],
  )
  const bogota = useMemo(
    () => proyectos.filter((p) => p.sede === "bogota").sort(porOrden),
    [proyectos],
  )

  // El reordenamiento solo ocurre dentro de la misma sede: mover un proyecto
  // entre sedes es cambiar su `sede`, no su posición.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const lista = [santaMarta, bogota].find((grupo) =>
      grupo.some((p) => p.id === active.id),
    )
    if (!lista) return

    const ids = lista.map((p) => p.id)
    if (!ids.includes(over.id as string)) return

    const nuevaLista = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string))
    void portafolio.reordenarProyectos(nuevaLista)
  }

  const manejarDragMedia = (payload: MediaDragPayload) => setArrastrando(payload)
  const terminarDragMedia = () => setArrastrando(null)

  const renderGrupo = (
    sede: SedeTaller,
    proyectosGrupo: ProyectoConMedia[],
    etiqueta: string,
    nota: string,
    tono: string,
  ) => (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
          <span className={`h-3 w-3 rounded-full ${tono}`} />
          {etiqueta}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {proyectosGrupo.length}
          </span>
        </h2>
        <span className="text-xs text-muted-foreground">{nota}</span>
      </div>

      {proyectosGrupo.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No hay proyectos en {etiqueta}.
        </div>
      ) : (
        <SortableContext items={proyectosGrupo.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {proyectosGrupo.map((proyecto, index) => (
              <ProyectoCard
                key={proyecto.id}
                proyecto={proyecto}
                index={index}
                onExpandChange={(expandido) =>
                  setDesplegados((prev) =>
                    expandido
                      ? [...prev.filter((id) => id !== proyecto.id), proyecto.id]
                      : prev.filter((id) => id !== proyecto.id),
                  )
                }
                onGuardar={(id, campos) => void portafolio.guardarProyecto(id, campos)}
                onEliminar={(id) => void portafolio.eliminarProyecto(id)}
                onSubirArchivos={(id, files, tipo) => void portafolio.subirArchivos(id, files, tipo)}
                onEliminarFoto={(id, fotoId) => void portafolio.eliminarFoto(id, fotoId)}
                onReordenarFotos={(id, ids) => void portafolio.reordenarFotos(id, ids)}
                onPortadaChange={(id, url) => void portafolio.cambiarPortada(id, url)}
                onEliminarVisor={(id, visorId) => void portafolio.eliminarVisor(id, visorId)}
                onToggleVisorActivo={(id, visorId) => void portafolio.toggleVisorActivo(id, visorId)}
                onReordenarVisores={(id, ids) => void portafolio.reordenarVisores(id, ids)}
                onAgregarVisores={(id, propuestaIds) => {
                  for (const propuestaId of propuestaIds) {
                    void portafolio.agregarVisor(id, propuestaId)
                  }
                }}
                onMoverCopiar={(payload, destino, accion) =>
                  void portafolio.moverCopiarMedia(payload, destino, accion)
                }
                arrastrando={arrastrando}
                onDragStartMedia={manejarDragMedia}
                onDragEndMedia={terminarDragMedia}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </section>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Portafolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Arrastra la manija para reordenar los proyectos, despliégalos para editar título, descripción,
            portada y galería. En Santa Marta puedes agregar visores 3D desde las propuestas del diseñador,
            y mover o copiar fotos y visores entre proyectos arrastrándolos.
          </p>
        </div>
        <Button className="press" onClick={() => setCreando(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
        </Button>
      </div>

      {cargando && proyectos.length === 0 ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : proyectos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-medium text-foreground">No hay proyectos registrados</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu primer proyecto con el botón «Nuevo proyecto».
          </p>
        </div>
      ) : (
        <DndContext
          id="portafolio-admin"
          sensors={sensores}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-10">
            {renderGrupo(
              "santa_marta",
              santaMarta,
              "Santa Marta",
              "Con visor 3D · propuestas del diseñador",
              "bg-emerald-500",
            )}
            {renderGrupo(
              "bogota",
              bogota,
              "Bogotá",
              "Histórico · solo galería de fotos",
              "bg-amber-500",
            )}
          </div>
        </DndContext>
      )}

      <CreandoProyectoDialog
        open={creando}
        onOpenChange={setCreando}
        onSuccess={() => void portafolio.refrescar()}
      />
    </div>
  )
}