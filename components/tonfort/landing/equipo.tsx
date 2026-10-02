"use client"

import Image from "next/image"
import { motion } from "motion/react"
import { EQUIPO } from "@/content/landing"

export function Equipo() {
  return (
    <section className="bg-black py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-14 max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.34em] text-[#3769e6]">
            {EQUIPO.eyebrow}
          </p>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1] tracking-[-0.05em] text-white">
            {EQUIPO.titulo}
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {EQUIPO.personas.map((persona, i) => (
            <motion.figure
              key={persona.nombre}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* 3:4, sin esencializar el rostro. */}
              <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#0a0a0a]">
                <Image
                  src={persona.foto}
                  alt={`${persona.nombre}, ${persona.rol}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <figcaption className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#f4d6a0]">
                  {persona.rol}
                </p>
                <p className="mt-2 text-[1.75rem] leading-tight tracking-[-0.04em] text-white">
                  {persona.nombre}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a1a1a6]">{persona.texto}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
