"use client"

import { motion } from "motion/react"
import { GradientText, Reveal } from "@/components/tonfort/public-animations"
import { NOSOTROS } from "@/content/landing"

// Presentación formal: qué hace Tonfort y qué piezas fabrica. Abre el
// contenido después del hero, antes de Luz (la identidad): primero el qué,
// después cómo se presenta el trabajo. Copy sintético a la izquierda,
// catálogo indexado a la derecha.
export function Nosotros() {
  return (
    <section className="section-y bg-black">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-14 md:grid-cols-2 md:gap-16">
          <Reveal>
            <p className="eyebrow mb-4 text-royal-bright">{NOSOTROS.eyebrow}</p>
            <h2 className="display-lg font-display text-balance text-white">
              {NOSOTROS.tituloLineas.map((linea, i) => (
                <span key={linea} className="block">
                  {i >= NOSOTROS.tituloGradienteDesdeLinea ? (
                    <GradientText>{linea}</GradientText>
                  ) : (
                    linea
                  )}
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-copy">{NOSOTROS.bajada}</p>
          </Reveal>

          <ol className="space-y-8">
            {NOSOTROS.puntos.map((punto, i) => (
              <motion.li
                key={punto.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-12% 0px" }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-6"
              >
                <span className="eyebrow pt-1.5 text-royal-bright">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg tracking-[-0.02em] text-white">{punto.titulo}</h3>
                  <p className="mt-1 text-base leading-7 text-copy">{punto.texto}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
