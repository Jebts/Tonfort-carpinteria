"use client"

import { useRef } from "react"
import { useViewerSequence } from "@/hooks/use-viewer-sequence"
import type { AnimacionVisor } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronUp, ChevronDown, Plus, Edit2, Trash2 } from "lucide-react"

// `T` es el tipo concreto de animación que recibe la superficie. En el editor es
// `Propuesta3DAnimacion` (necesita velocidad/selección); en lectura pública
// basta con `AnimacionVisor`, que es su espejo en `visores_landing`.
export interface VideoViewerProps<T extends AnimacionVisor = AnimacionVisor> {
  video_global_url: string | null
  frame_centro_ms: number | null
  animaciones: T[]
  titulo_proyecto: string
  nombreproducto: string
  descripcion?: string | null
  isCotizacion?: boolean
  onElegir?: () => void
  isEditor?: boolean
  hideHeader?: boolean
  hideContentSection?: boolean
  onAddAnimacion?: () => void
  onEditAnimacion?: (animacion: T) => void
  onDeleteAnimacion?: (animacion: T) => void
  /** Avisa cuando el video global ya está listo (ver `useViewerSequence`). */
  onVideoListo?: () => void
  children?: React.ReactNode
  sidebarCollapsed?: boolean
  modeToggle?: React.ReactNode
}

export function VideoViewer<T extends AnimacionVisor = AnimacionVisor>({
  video_global_url,
  frame_centro_ms,
  animaciones,
  titulo_proyecto,
  nombreproducto,
  descripcion,
  isCotizacion = false,
  onElegir,
  isEditor = false,
  hideHeader = false,
  hideContentSection = false,
  onAddAnimacion,
  onEditAnimacion,
  onDeleteAnimacion,
  onVideoListo,
  children,
  sidebarCollapsed = false,
  modeToggle,
}: VideoViewerProps<T>) {
  const videoRefA = useRef<HTMLVideoElement>(null)
  const videoRefB = useRef<HTMLVideoElement>(null)
  const nodoScrollRef = useRef<HTMLDivElement>(null)

  const frameCentroMs = frame_centro_ms

  const sequence = useViewerSequence({
    videoRef: videoRefA,
    videoRefB: videoRefB,
    videoGlobalUrl: video_global_url,
    frameCentroMs,
    velocidadNormal: 1,
    velocidadInversa: 2,
    onVideoGlobalListo: onVideoListo,
  })

  if (!video_global_url) {
    return (
      <div
        className={cn(
          "flex min-h-[60svh] w-full flex-col items-center justify-center px-6 text-center",
          isEditor ? "bg-black" : "bg-[#1d1d1f]",
        )}
      >
        <p className="font-sans text-lg text-white/70">No hay video configurado</p>
      </div>
    )
  }

  const activeAnimacion = sequence.activeAnimacion

  // En la lectura pública el contenedor y la banda de controles son el gris
  // medio de Apple (#1d1d1f) y el video queda como el único rectángulo negro.
  // El editor de staff conserva su negro: es una herramienta, no una pieza de
  // escaparate.
  const superficie = isEditor ? "bg-black" : "bg-[#1d1d1f]"

  const scrollUp = () => {
    if (nodoScrollRef.current) {
      nodoScrollRef.current.scrollBy({ top: -120, behavior: "smooth" })
    }
  }

  const scrollDown = () => {
    if (nodoScrollRef.current) {
      nodoScrollRef.current.scrollBy({ top: 120, behavior: "smooth" })
    }
  }

return (
    <div
      className={cn(
        "relative flex w-full flex-col text-white",
        superficie,
        isEditor
          ? cn("min-h-[100svh]", !sidebarCollapsed && "md:ml-80")
          : "min-h-0",
      )}
    >
      {!hideHeader && children}
      {modeToggle && (
        <div className="fixed top-20 right-6 z-[70]">{modeToggle}</div>
      )}

      {/* Escenario estilo Apple: el negro es el rectángulo del video y el gris
          es el fondo de la sección. El aire de arriba y abajo separa los dos
          planos y da la sensación de profundidad de la referencia. */}
      <div className="px-4 py-10 md:px-8 md:py-16">
        <div className="relative mx-auto w-full max-w-5xl">
          {/* Rectángulo negro: los dos videos se apilan sin transición, el
              saliente permanece visible hasta que el entrante tiene frame. */}
          <div className="relative h-[65svh] w-full overflow-hidden rounded-2xl bg-black md:h-auto md:aspect-video">
        <video
          ref={videoRefA}
          muted
          playsInline
          preload="auto"
          onError={(event) => {
            // Un fallo de red en una precarga especulativa no se le enseña al
            // usuario: el clip se pedira bajo demanda cuando realmente haga falta.
            if (sequence.shouldIgnoreMediaError(event.currentTarget)) return
            sequence.setError("Error al cargar el video desde Storage. Verifique que el archivo existe en el bucket 'visores-video'.")
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover md:object-contain pointer-events-none",
            sequence.activeSlot === "A" ? "opacity-100 z-10" : "opacity-0 z-0",
          )}
          aria-label={`Video de propuesta ${titulo_proyecto} — ${nombreproducto}`}
          tabIndex={0}
        />
        <video
          ref={videoRefB}
          muted
          playsInline
          preload="auto"
          onError={(event) => {
            // Un fallo de red en una precarga especulativa no se le enseña al
            // usuario: el clip se pedira bajo demanda cuando realmente haga falta.
            if (sequence.shouldIgnoreMediaError(event.currentTarget)) return
            sequence.setError("Error al cargar el video desde Storage. Verifique que el archivo existe en el bucket 'visores-video'.")
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover md:object-contain pointer-events-none",
            sequence.activeSlot === "B" ? "opacity-100 z-10" : "opacity-0 z-0",
          )}
          aria-label={`Video de propuesta ${titulo_proyecto} — ${nombreproducto} buffer`}
          tabIndex={-1}
        />
          {/* Nodos como en la referencia de Apple: columna a la izquierda,
              centrada en vertical dentro del propio rectángulo del video. */}
          <aside
            className={cn(
              "absolute left-5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-start gap-3 overflow-y-auto",
              "md:left-8",
            )}
          >
                {animaciones.length > 4 && (
                  <button
                    type="button"
                    onClick={scrollUp}
                    className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c1e] text-white hover:bg-[#2c2c2e] transition-all shadow-md cursor-pointer"
                    aria-label="Desplazar nodos arriba"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}

            <div
              ref={nodoScrollRef}
              className="flex flex-col items-start justify-center gap-3 overflow-y-auto no-scrollbar max-h-[52svh] py-1 px-1"
            >
                  {animaciones.map((animacion) => {
                    const isActive = activeAnimacion?.id === animacion.id

                    return (
                      <div key={animacion.id} className="flex items-center gap-2 transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => sequence.selectAnimacion(animacion)}
                          onPointerEnter={() => sequence.preloadSlot(animacion.video_movimiento_url ?? animacion.video_accion_url)}
                          onPointerDown={() => sequence.preloadSlot(animacion.video_movimiento_url ?? animacion.video_accion_url)}
                          onFocus={() => sequence.preloadSlot(animacion.video_movimiento_url ?? animacion.video_accion_url)}
                          disabled={sequence.isLocked}
                          className={cn(
                            // Patrón "Take a closer look" de Apple: cápsula gris con
                            // un círculo `+` que pasa a `✓` y la cápsula entera a
                            // blanco cuando el punto está activo.
                            "inline-flex items-center gap-3 rounded-full px-5 py-3.5 text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap",
                            isActive
                              ? "bg-white text-black font-semibold"
                              : cn(
                                  "text-white hover:bg-[#4a4a4c]",
                                  isEditor ? "bg-[#1c1c1e]" : "bg-[#3a3a3c]",
                                ),
                            sequence.isLocked && "cursor-not-allowed opacity-50",
                          )}
                          aria-label={`Seleccionar nodo: ${animacion.titulo}`}
                          aria-pressed={isActive}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors",
                              isActive ? "bg-black text-white" : "bg-white/15 text-white",
                            )}
                          >
                            {isActive ? "✓" : "+"}
                          </span>
                          <span>{animacion.titulo}</span>
                        </button>

                        {isEditor && (
                          <div className="flex items-center gap-1">
                            {onEditAnimacion && (
                              <button
                                type="button"
                                onClick={() => onEditAnimacion(animacion)}
                                className="p-2 rounded-full bg-[#1c1c1e] text-white hover:bg-[#2c2c2e] transition-colors cursor-pointer"
                                aria-label={`Editar ${animacion.titulo}`}
                                title="Editar punto"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {onDeleteAnimacion && (
                              <button
                                type="button"
                                onClick={() => onDeleteAnimacion(animacion)}
                                className="p-2 rounded-full bg-[#1c1c1e] text-red-400 hover:bg-[#2c2c2e] transition-colors cursor-pointer"
                                aria-label={`Eliminar ${animacion.titulo}`}
                                title="Eliminar punto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Descripción expandible dentro del nodo */}
                        {isActive && animacion.descripcion && (
                          <p className="text-xs text-white/80 max-w-[200px] hidden md:block">
                            {animacion.descripcion}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {isEditor && onAddAnimacion && (
                    <button
                      type="button"
                      onClick={onAddAnimacion}
                      className="inline-flex items-center gap-2 rounded-full bg-[#27272a] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3f3f46] transition-all cursor-pointer shadow-md"
                      aria-label="Añadir nuevo punto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Añadir Punto</span>
                    </button>
                  )}
                </div>

                {animaciones.length > 4 && (
                  <button
                    type="button"
                    onClick={scrollDown}
                    className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c1e] text-white hover:bg-[#2c2c2e] transition-all shadow-md cursor-pointer"
                    aria-label="Desplazar nodos abajo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </aside>
          </div>

          {/* Barra de desplazamiento: debajo del video, centrada respecto a él */}
          <div className="mx-auto mt-6 w-full max-w-2xl">
            <AppleScrubber
              currentTimeMs={sequence.currentTimeMs}
              durationMs={sequence.durationMs}
              onScrub={(ms) => sequence.scrubTo(ms)}
              onScrubEnd={() => sequence.snapToMagnet()}
            />
          </div>
        </div>
      </div>

      {/* Botón global de volver - solo visible cuando no está en GLOBAL */}
      {(activeAnimacion || sequence.state !== "GLOBAL") && (
        <button
          type="button"
          onClick={sequence.reverseToGlobal}
          disabled={sequence.isLocked}
          className={cn(
            "fixed top-20 right-6 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-[#1c1c1e] text-white shadow-2xl transition-all hover:bg-[#2c2c2e] hover:scale-105 active:scale-95 cursor-pointer",
            sequence.isLocked && "opacity-50 cursor-not-allowed",
          )}
          title="Volver a la vista general (reversa 2x)"
          aria-label="Volver a la vista general"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}


        {/* Contenido scrollable debajo del video */}
        {!hideContentSection && (
          <div className="relative z-10 bg-black px-6 pb-16 pt-12 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <h1 className="display-lg text-white">{titulo_proyecto}</h1>
              <p className="mt-4 text-lg text-white/80 font-sans">{nombreproducto}</p>
              { descripcion && (
                <p className="mt-6 text-white/70 font-sans text-base leading-relaxed">
                  {descripcion}
                </p>
              )}

              {isCotizacion && onElegir && (
                <button
                  type="button"
                  onClick={onElegir}
                  className="mt-8 inline-flex items-center rounded-full bg-[#E8DFD0] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-widest text-[#0B1D3A] hover:opacity-90 transition-opacity"
                >
                  Elegir esta propuesta
                </button>
              )}
            </div>
          </div>
        )}

        {sequence.error && (
          <div
            role="alert"
            className="relative z-20 mx-auto mb-4 w-fit max-w-full rounded-xl bg-red-900 px-5 py-3 text-sm font-medium text-white"
          >
            {sequence.error}
          </div>
        )}
    </div>
  )
}

interface AppleScrubberProps {
  currentTimeMs: number
  durationMs: number
  onScrub: (timeMs: number) => void
  onScrubEnd: () => void
}

function AppleScrubber({ currentTimeMs, durationMs, onScrub, onScrubEnd }: AppleScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const safeDuration = Math.max(durationMs, 1)
  const progressPercent = Math.min(100, Math.max(0, (currentTimeMs / safeDuration) * 100))

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    updatePosition(e)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      e.currentTarget.releasePointerCapture(e.pointerId)
      onScrubEnd()
    }
  }

  const updatePosition = (e: React.PointerEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, offsetX / rect.width))
    // Usar valor exacto sin redondear para suavidad máxima
    onScrub(ratio * safeDuration)
  }

  const handleSize = 16

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex items-center h-6 w-full cursor-pointer touch-none select-none"
      style={{ touchAction: "none" }}
      aria-label="Barra interactiva de desplazamiento"
    >
      {/* Línea delgada del track */}
      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-white/20 rounded-full" />

      {/* Punto indicador */}
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-125"
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          left: `calc(${progressPercent}% - ${handleSize / 2}px)`,
        }}
      />
    </div>
  )
}