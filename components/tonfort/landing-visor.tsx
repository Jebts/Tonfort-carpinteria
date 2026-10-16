"use client"

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
  className?: string
}

/**
 * Envoltorio de lectura pública de `VideoViewer`. Permite que la página de
 * proyecto importe el visor sin traer el editor de staff ni saber cómo se llaman
 * sus props internas.
 *
 * Antes tenía un modo `pinned` de `100svh + 800px` con `position: sticky` que
 * usaba la landing. La sección de presentación de diseños ahora es un carrusel
 * (`components/tonfort/landing/visor-carousel.tsx`) y ya no hay scroll
 * bloqueado: dos secciones fijas añadían 1600 px de scroll y repintado.
 */
export function LandingVisor({
  videoGlobalUrl,
  frameCentroMs,
  animaciones,
  titulo,
  descripcion,
  eyebrow,
  className = "",
}: LandingVisorProps) {
  return (
    <section className={`bg-black py-20 md:py-28 ${className}`}>
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
      <div className="mx-auto max-w-7xl overflow-hidden px-4 md:px-8">
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
      </div>
    </section>
  )
}