"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  // Apple-style: image zooms slightly and darkens, text drifts up and fades as you scroll away.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const overlay = useTransform(scrollYProgress, [0, 1], [0.45, 0.85])
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section id="top" ref={ref} className="relative h-[100svh] w-full overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0">
        <img
          src="/images/hero-fullbleed.png"
          alt="Interior de cocina a medida en madera con luz natural cálida diseñado por Tonfort"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <motion.div style={{ opacity: overlay }} className="absolute inset-0 bg-[#050a12]" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#050a12]/80 via-transparent to-[#050a12]/30"
        aria-hidden
      />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-24 lg:px-10 lg:pb-28"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="eyebrow mb-6 text-white/70"
        >
          Tonfort — Diseño de espacios
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="display-xl max-w-4xl text-balance font-display text-white"
        >
          No hacemos muebles. Diseñamos el espacio que habitas.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-white/85"
        >
          Cocinas, closets, muebles de TV y puertas en madera, pensados desde la arquitectura,
          la planeación y la luz. Vendemos la experiencia de un lugar.
        </motion.p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#proyectos"
            className="rounded-full bg-white px-8 py-3.5 font-mono text-xs uppercase tracking-widest text-[#0a1f33] transition-opacity hover:opacity-90"
          >
            Ver proyectos
          </a>
          <a
            href="#contacto"
            className="rounded-full border border-white/40 px-8 py-3.5 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Diseñemos tu espacio
          </a>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: textOpacity }}
        className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
        aria-hidden
      >
        <span className="flex flex-col items-center gap-2 text-white/60">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em]">Descubre</span>
          <span className="h-10 w-px animate-pulse bg-white/40" />
        </span>
      </motion.div>
    </section>
  )
}
