"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Reveal } from "./reveal"

export function Gallery() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"])

  return (
    <section id="proyectos" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-6 text-muted-foreground">Proyectos</p>
            <h2 className="display-lg max-w-2xl text-balance font-display text-foreground">
              Espacios que hablan solos.
            </h2>
          </div>
          <a
            href="#contacto"
            className="font-mono text-xs uppercase tracking-widest text-accent underline-offset-8 hover:underline"
          >
            Solicitar portafolio →
          </a>
        </div>
      </div>

      {/* Featured full-bleed with parallax */}
      <div ref={ref} className="relative mt-14 h-[80svh] w-full overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-0 -top-[10%] h-[120%]">
          <img
            src="/images/space-wide.png"
            alt="Espacio integral de estar y comedor con mobiliario a medida e iluminación en capas"
            className="h-full w-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a12]/60 to-transparent" />
        <div className="absolute bottom-10 left-0 w-full px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-xs uppercase tracking-widest text-white/70">Proyecto residencial · Estar integral</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-7xl grid-cols-1 gap-4 px-6 md:grid-cols-2 lg:px-10">
        <Reveal className="overflow-hidden rounded-lg">
          <img
            src="/images/tv-wall.png"
            alt="Mueble de televisión flotante con retroiluminación integrada"
            className="h-72 w-full object-cover transition-transform duration-700 hover:scale-105 sm:h-[26rem]"
          />
        </Reveal>
        <Reveal delay={0.12} className="overflow-hidden rounded-lg">
          <img
            src="/images/closet.png"
            alt="Closet a medida con estantería iluminada"
            className="h-72 w-full object-cover transition-transform duration-700 hover:scale-105 sm:h-[26rem]"
          />
        </Reveal>
      </div>
    </section>
  )
}
