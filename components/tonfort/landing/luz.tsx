"use client"

import { motion } from "motion/react"
import { ParallaxImage, GradientText, Reveal } from "@/components/tonfort/public-animations"
import { LUZ } from "@/content/landing"

export function Luz() {
  return (
    <section className="section-y relative overflow-hidden bg-black">
      {/* En oscuro el acento es el beige (design system §2.6). */}
      <div className="tonfort-beige-glow pointer-events-none absolute left-[12%] top-[24%] size-[32rem] rounded-full bg-brand-beige opacity-[0.07] blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-12 md:px-10">
        {/* En mobile el texto va primero: la idea antes que la imagen. */}
        <div className="order-2 md:order-1 md:col-span-5">
          <Reveal>
            <p className="eyebrow mb-4 text-royal-bright">{LUZ.eyebrow}</p>
            <h2 className="display-lg font-display text-white">
              {LUZ.tituloLineas.map((linea, i) => (
                <span key={linea} className="block">
                  {i >= LUZ.tituloGradienteDesdeLinea ? (
                    <GradientText>{linea}</GradientText>
                  ) : (
                    linea
                  )}
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-copy">{LUZ.bajada}</p>
          </Reveal>

          <ul className="mt-10">
            {LUZ.puntos.map((punto, i) => (
              <motion.li
                key={punto.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-12% 0px" }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="border-t border-white/10 py-6 last:border-b"
              >
                <p className="eyebrow text-warm-light">{punto.titulo}</p>
                <p className="mt-2 text-base leading-7 text-copy">{punto.texto}</p>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="order-1 md:order-2 md:col-span-6 md:col-start-7">
          {/* El gradiente beige sube al hover: el detalle de luz se "enciende". */}
          <div className="group relative overflow-hidden rounded-2xl">
            <ParallaxImage
              src="/light-detail-ceiling.png"
              alt="Detalle de luz integrada en el techo de un mueble Tonfort"
              className="aspect-[4/5] w-full"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-beige to-transparent opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-[0.18]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
