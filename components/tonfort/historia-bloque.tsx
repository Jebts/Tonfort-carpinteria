"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Reveal } from "./reveal"
import type { BloqueHistoria } from "@/content/historia"

// Bloque de la página /historia: paleta cálida (cremas, maderas, ámbar),
// con reveal suave y el efecto de "luz cálida" sobre la imagen.
export function HistoriaBloque({ bloque }: { bloque: BloqueHistoria }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const brightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.5, 1.1, 0.75])
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1])

  return (
    <section ref={ref} className="border-t border-[#e7d9c8] bg-[#f7efe4] py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div
          className={`grid items-center gap-12 lg:grid-cols-2 ${
            bloque.imagenDerecha ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#e7d9c8] shadow-sm">
            <motion.div
              style={{
                scale,
                filter: useTransform(brightness, (b) => `brightness(${b})`),
              }}
              className="absolute inset-0"
            >
              {/* TODO: reemplazar con fotografía real de la familia / taller */}
              <img src={bloque.imagen} alt={bloque.titulo} className="h-full w-full object-cover" />
            </motion.div>
            <motion.div
              style={{ opacity: useTransform(scrollYProgress, [0.2, 0.6], [0, 0.4]) }}
              className="pointer-events-none absolute left-1/4 top-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-[#f2c89a] blur-3xl"
              aria-hidden
            />
          </div>

          <div>
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#b07429]">
                {bloque.etiqueta}
              </p>
              <h2 className="mt-5 text-balance font-display text-3xl leading-tight text-[#3a2a1d] lg:text-4xl">
                {bloque.titulo}
              </h2>
            </Reveal>
            <div className="mt-6 space-y-4">
              {bloque.parrafos.map((p, i) => (
                <Reveal key={i} delay={0.1 + i * 0.08}>
                  <p className="text-pretty text-base leading-relaxed text-[#5a4636]">{p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
