"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"

export function Lighting() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // The image "wakes up": starts dim, brightens as it enters view — the light turning on.
  const brightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.35, 1.05, 0.6])
  const scale = useTransform(scrollYProgress, [0, 1], [1.2, 1])
  const glow = useTransform(scrollYProgress, [0.2, 0.55], [0, 0.55])

  return (
    <section id="luz" ref={ref} className="relative h-[110svh] w-full overflow-hidden bg-[#050a12]">
      <motion.div style={{ scale, filter: useTransform(brightness, (b) => `brightness(${b})`) }} className="absolute inset-0">
        <img
          src="/images/light-atmosphere.png"
          alt="Interior en penumbra donde la luz cálida integrada dibuja la arquitectura"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#050a12]/70 via-[#050a12]/20 to-[#050a12]/90" />
      <motion.div
        style={{ opacity: glow }}
        className="pointer-events-none absolute left-1/2 top-1/3 h-[40vw] w-[40vw] -translate-x-1/2 rounded-full bg-[#f2dbce] blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="eyebrow mb-8 text-white/60"
        >
          El detalle que lo cambia todo
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="display-lg text-balance font-display text-white"
        >
          Un mueble bien iluminado deja de ser un mueble. Empieza a ser atmósfera.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-white/80"
        >
          Trabajamos la luz como un material más del proyecto: escondida en un canto, lavando una
          pared, marcando un umbral. La misma pieza puede ser cálida al amanecer y serena de noche.
          Eso no se compra hecho: se diseña.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 font-mono text-xs uppercase tracking-widest text-white/60"
        >
          <span>Luz escondida en el mobiliario</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" />
          <span>Capas para cada hora del día</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" />
          <span>Atmósfera por ambiente</span>
        </motion.div>
      </div>
    </section>
  )
}
