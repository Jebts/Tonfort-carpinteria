"use client"

import Image from "next/image"
import { motion } from "motion/react"
import { GradientText, Reveal } from "@/components/tonfort/public-animations"
import { LUZ } from "@/content/landing"

/**
 * Identidad.
 *
 * `light-detail-ceiling.png` es un cuadro 1:1 con la luminaria flotando en
 * mucho negro: la banda útil ocupa del 30% al 70% del alto y los bordes son
 * negro puro. Por eso la banda se recorta a 2:1 —el recorte central se queda
 * justo con la luminaria y conserva el negro de los bordes—, así que la foto
 * se funde con el fondo sin necesidad de un degradado fuerte. El degradado
 * suave que lleva encima solo remata los cantos por si el recorte cambia.
 *
 * El titular va encima y los tres puntos debajo, ambos centrados: el texto
 * nunca se cruza con la banda de LED, que es lo que pasaba cuando la foto
 * estaba de fondo de toda la sección.
 */
export function Luz() {
  return (
    <section className="section-y relative isolate overflow-hidden bg-black">
      {/* 1. Titular centrado */}
      <div className="relative mx-auto max-w-4xl px-6 text-center md:px-10">
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
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-copy">{LUZ.bajada}</p>
        </Reveal>
      </div>

      {/* 2. Foto a todo el ancho de la pantalla */}
      <div className="relative mt-16 w-full md:mt-24">
        <div className="relative mx-auto aspect-[16/9] w-full max-h-[560px] md:aspect-[2/1]">
          <Image
            src="/light-detail-ceiling.png"
            alt="Luminaria de techo con perfiles de madera y luz perimetral"
            fill
            sizes="100vw"
            className="pointer-events-none select-none object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,#000_0%,rgba(0,0,0,.35)_14%,transparent_32%,transparent_68%,rgba(0,0,0,.35)_86%,#000_100%)]"
          />
        </div>
      </div>

      {/* 3. Los tres puntos, centrados debajo */}
      <ul className="relative mx-auto mt-16 grid max-w-5xl gap-x-10 gap-y-12 px-6 text-center md:mt-20 md:grid-cols-3 md:px-10">
        {LUZ.puntos.map((punto, i) => (
          <motion.li
            key={punto.titulo}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12% 0px" }}
            transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative pt-6"
          >
            {/* Separador gradiente: `border-t border-white/10` dejaba una
                línea recta de alto contraste. */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
            <p className="eyebrow text-warm-light">{punto.titulo}</p>
            <p className="mt-2 text-base leading-7 text-copy">{punto.texto}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}