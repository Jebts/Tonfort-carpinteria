"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import { VISORES } from "@/content/landing"
import type { VisorLandingConAnimaciones } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

export interface VisoresCarouselProps {
  visores: VisorLandingConAnimaciones[]
}

/** Visores con video global: sin él no hay nada que ver. */
function visiblesConVideo(visores: VisorLandingConAnimaciones[]) {
  return visores.filter((visor) => Boolean(visor.video_global_url))
}

/** Debe coincidir con la duración de las animaciones de `globals.css`. */
const DURACION_CRUCE_MS = 620

/**
 * Techo de espera al video entrante. Si la red falla o el archivo tarda más de
 * la cuenta, se muestra la diapositiva igual: es preferible un rectángulo negro
 * momentáneo a un carrusel que se queda congelado en la diapositiva anterior.
 */
const ESPERA_MAXIMA_MS = 1600

interface Diapositiva {
  clave: string
  visor: VisorLandingConAnimaciones
  direccion: "next" | "prev"
  /** Sigue oculta hasta que su video esté decodificado y en el frame centro. */
  esperando: boolean
  /** Se está retirando: solo ejecuta el fundido de salida. */
  saliendo: boolean
  onListo: () => void
}

/**
 * Carrusel de presentación de diseños.
 *
 * El cruce entre diapositivas es un fundido real, no un reemplazo: la
 * diapositiva saliente sigue montada mientras la entrante aparece encima. Sin
 * eso se veía un rectángulo negro, porque la entrante arrancaba con su video en
 * `opacity-0` y nada tapaba ese hueco.
 *
 * Para que el fundido no cruce con un video sin decodificar, la entrante espera
 * a que `VideoViewer` avise de que su video global está listo (`onVideoListo`)
 * antes de empezar a ser visible.
 *
 * Cada `VideoViewer` monta dos `<video preload="auto">`, así que fuera del
 * cruce solo hay uno en el DOM: dos como máximo, y solo durante 620 ms.
 * Recibe la lista desde el Server Component: no hace fetch.
 */
export function VisoresCarousel({ visores }: VisoresCarouselProps) {
  const visibles = visiblesConVideo(visores)
  const total = visibles.length
  const [indice, setIndice] = useState(0)
  const [suspendido, setSuspendido] = useState(false)
  const seccionRef = useRef<HTMLElement>(null)
  const contador = useRef(0)

  const marcarListo = useCallback((clave: string) => {
    setDiapositivas((prev) =>
      prev.some((d) => d.clave === clave && d.esperando)
        ? prev.map((d) => (d.clave === clave ? { ...d, esperando: false } : d))
        : prev,
    )
  }, [])

  const [diapositivas, setDiapositivas] = useState<Diapositiva[]>(() =>
    total > 0
      ? [{ ...nuevaDiapositiva(visibles[0], "next", false, marcarListo, contador), esperando: false }]
      : [],
  )

  const ir = useCallback(
    (destino: number) => {
      if (total === 0) return
      const siguiente = ((destino % total) + total) % total
      if (siguiente === indice) return

      const dir = siguiente > indice ? "next" : "prev"
      setIndice(siguiente)
      setDiapositivas((prev) => [
        ...prev.map((d) => ({ ...d, saliendo: true, esperando: false })),
        nuevaDiapositiva(visibles[siguiente], dir, true, marcarListo, contador),
      ])
    },
    [total, indice, visibles, marcarListo],
  )

  // Índice fuera de rango (la lista se acortó): volvemos a la primera.
  useEffect(() => {
    if (total > 0 && indice >= total) ir(0)
  }, [total, indice, ir])

  // Gobierna el ciclo de vida de la diapositiva en espera y la retirada de la
  // saliente una vez consumado el cruce.
  useEffect(() => {
    const pendiente = diapositivas.find((d) => d.esperando)
    if (pendiente) {
      const techo = window.setTimeout(() => marcarListo(pendiente.clave), ESPERA_MAXIMA_MS)
      return () => window.clearTimeout(techo)
    }

    if (!diapositivas.some((d) => d.saliendo)) return
    const retirada = window.setTimeout(() => {
      setDiapositivas((prev) => prev.filter((d) => !d.saliendo))
    }, DURACION_CRUCE_MS)
    return () => window.clearTimeout(retirada)
  }, [diapositivas, marcarListo])

  // Fuera de viewport no hace falta ni el video ni el nodo: se desmonta el
  // `VideoViewer` y se sueltan las descargas.
  useEffect(() => {
    const seccion = seccionRef.current
    if (!seccion || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entrada]) => setSuspendido(!entrada.isIntersecting),
      { rootMargin: "120px" },
    )
    observer.observe(seccion)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const seccion = seccionRef.current
    if (!seccion) return

    const alPulsar = (evento: KeyboardEvent) => {
      const destino = evento.target as HTMLElement | null
      if (destino?.closest("input, textarea, select, [contenteditable]")) return
      if (evento.key === "ArrowLeft") {
        evento.preventDefault()
        ir(indice - 1)
      } else if (evento.key === "ArrowRight") {
        evento.preventDefault()
        ir(indice + 1)
      }
    }

    seccion.addEventListener("keydown", alPulsar)
    return () => seccion.removeEventListener("keydown", alPulsar)
  }, [indice, ir])

  if (total === 0) return null

  return (
    <section
      ref={seccionRef}
      aria-roledescription="carrusel"
      aria-label={VISORES.titulo}
      tabIndex={-1}
      className="section-y bg-[#1d1d1f] outline-none"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-10 max-w-3xl">
          <p className="eyebrow mb-4 text-royal-bright">{VISORES.eyebrow}</p>
          <h2 className="display-lg font-display text-balance text-white">{VISORES.titulo}</h2>
          <p className="mt-5 text-base leading-7 text-copy">{VISORES.descripcion}</p>
        </div>

        <div
          className="group/carrosel relative flex items-center gap-3 md:gap-4"
          data-indice={indice}
          data-total={total}
        >
          <button
            type="button"
            onClick={() => ir(indice - 1)}
            disabled={total < 2}
            aria-label="Visor anterior"
            className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-3 text-white opacity-0 backdrop-blur transition-opacity duration-300 hover:bg-black/80 focus-visible:opacity-100 group-hover/carrosel:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Pila de diapositivas. La saliente es absoluta para no robarle la
              altura a la entrante, que es la que marca la caja. */}
          <div className="relative min-w-0 flex-1 overflow-hidden">
            {suspendido ? (
              <div className="h-[65svh] w-full md:aspect-video" />
            ) : (
              diapositivas.map((d) => (
                <div
                  key={d.clave}
                  data-activa={!d.saliendo}
                  className={cn(
                    // Saliente y entrante son estados excluyentes: compartir
                    // clases dejaría la animación de salida compitiendo con la
                    // de entrada sobre el mismo elemento.
                    d.saliendo && "absolute inset-0 tonfort-visor-out",
                    !d.saliendo && "relative",
                    !d.saliendo && d.esperando && "invisible",
                    !d.saliendo &&
                      !d.esperando &&
                      (d.direccion === "next"
                        ? "tonfort-visor-next"
                        : "tonfort-visor-prev"),
                  )}
                >
                  <VideoViewer
                    video_global_url={d.visor.video_global_url}
                    frame_centro_ms={d.visor.frame_centro_ms}
                    animaciones={d.visor.animaciones}
                    titulo_proyecto={d.visor.titulo}
                    nombreproducto={d.visor.descripcion ?? ""}
                    descripcion={null}
                    isEditor={false}
                    hideHeader
                    hideContentSection
                    sidebarCollapsed
                    onVideoListo={d.onListo}
                  />
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => ir(indice + 1)}
            disabled={total < 2}
            aria-label="Visor siguiente"
            className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-3 text-white opacity-0 backdrop-blur transition-opacity duration-300 hover:bg-black/80 focus-visible:opacity-100 group-hover/carrosel:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {visibles.map((visor, i) => (
            <button
              key={visor.id}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir al visor ${i + 1}: ${visor.titulo}`}
              aria-current={i === indice}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === indice ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Crea una diapositiva con su clave única y su aviso de "video listo". */
function nuevaDiapositiva(
  visor: VisorLandingConAnimaciones,
  direccion: "next" | "prev",
  esperando: boolean,
  marcarListo: (clave: string) => void,
  contador: { current: number },
): Diapositiva {
  const clave = `d${contador.current++}-${visor.id}`
  return {
    clave,
    visor,
    direccion,
    esperando,
    saliendo: false,
    onListo: () => marcarListo(clave),
  }
}
