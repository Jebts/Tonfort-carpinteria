"use client"

import { useEffect, useRef } from "react"
import { useInViewport } from "@/hooks/use-in-viewport"

/**
 * Fondo animado del cierre de la landing: burbujas en video + la onda `.tonfort-
 * fabric`. Reemplaza a la antigua `BlueFabricPerformance`, que era una sección
 * completa de `min-h-[92vh]` con su propio titular.
 *
 * El video son 2,8 MB, así que la carga es diferida en los tres puntos que
 * importan: `preload="none"`, `poster` de 56 KB para el primer pintado, y
 * `play()`/`pause()` ligados a un IntersectionObserver. Fuera de pantalla no hay
 * descarga ni decodificación; la onda de `.tonfort-fabric` tampoco corre, la
 * gobierna el `data-vivo` que pone este mismo observer (ver `globals.css`).
 *
 * `mix-blend-screen` sobre el navy: el negro del video se vuelve transparente y
 * solo quedan las burbujas.
 */
export function FondoBurbujas() {
  const { ref, inView } = useInViewport<HTMLDivElement>()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView) {
      // Puede rechazar si el navegador aún no ha pintado: el `loop` lo
      // reintenta en el siguiente cambio de estado.
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [inView])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        src="/tonfort-bubbles.mp4"
        poster="/tonfort-bubbles-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        className="absolute inset-0 size-full object-cover opacity-65 mix-blend-screen"
      />
      <div className="tonfort-fabric absolute inset-[-10%] opacity-35" data-vivo={inView} />
      {/* El radial original terminaba en negro; aquí cierra sobre el navy de la
          sección para que el video no se recorte en un rectángulo. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,#000000_76%)]" />
    </div>
  )
}