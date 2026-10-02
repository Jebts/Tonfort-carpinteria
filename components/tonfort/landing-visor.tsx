"use client"

import { useRef } from "react"
import { motion } from "motion/react"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import type { AnimacionVisor } from "@/lib/supabase/types"

export interface LandingVisorProps {
  videoGlobalUrl: string
  frameCentroMs: number
  animaciones: AnimacionVisor[]
  titulo: string
  descripcion?: string | null
  eyebrow?: string | null
  /**
   * `pinned` es el comportamiento de la landing: la sección es más alta que el
   * viewport y el visor queda fijo mientras el scroll avanza. `inline` se usa
   * en la página de proyecto, donde el visor fluye con el resto del documento.
   */
  layout?: "pinned" | "inline"
  className?: string
}

// Envoltorio de lectura pública de `VideoViewer`. Permite que la landing y la
// página de proyecto importen el visor sin traer el editor de staff ni saber
// cómo se llaman sus props internos.
export function LandingVisor({
  videoGlobalUrl,
  frameCentroMs,
  animaciones,
  titulo,
  descripcion,
  eyebrow,
  layout = "pinned",
  className = "",
}: LandingVisorProps) {
  const ref = useRef<HTMLDivElement>(null)

  const viewer = (
    <VideoViewer
      video_global_url={videoGlobalUrl}
      frame_centro_ms={frameCentroMs}
      animaciones={animaciones}
      titulo_proyecto={titulo}
      nombreproducto={descripcion ?? ""}
      descripcion={null}
      isEditor={false}
      hideHeader
      hideContentSection
      sidebarCollapsed
    />
  )

  const heading = (
    <div className="mx-auto mb-10 max-w-3xl px-6 md:px-10">
      {eyebrow && (
        <p className="mb-4 text-xs uppercase tracking-[0.34em] text-[#3769e6]">{eyebrow}</p>
      )}
      <motion.h2
        data-motion-reveal=""
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl font-medium leading-[.95] tracking-[-0.04em] text-white md:text-6xl"
      >
        {titulo}
      </motion.h2>
      {descripcion && (
        <p className="mt-5 max-w-xl text-base leading-7 text-[#a1a1a6] md:text-lg">{descripcion}</p>
      )}
    </div>
  )

  if (layout === "inline") {
    return (
      <section className={`bg-black py-20 md:py-28 ${className}`}>
        {heading}
        <div className="mx-auto max-w-7xl overflow-hidden px-4 md:px-8">{viewer}</div>
      </section>
    )
  }

  return (
    <section ref={ref} className={`relative h-[calc(100svh+800px)] bg-black ${className}`}>
      <div className="sticky top-0 flex min-h-[100svh] flex-col justify-center overflow-hidden">
        <div className="pt-24 md:pt-28">{heading}</div>
        <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 md:px-8">{viewer}</div>
      </div>
    </section>
  )
}