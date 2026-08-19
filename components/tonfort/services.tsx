"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"

const services = [
  {
    name: "Cocinas",
    image: "/images/hero-kitchen.png",
    line: "El corazón del hogar",
    description: "Planificadas para el flujo, la luz y la vida diaria. Cada volumen responde al recorrido de quien la habita.",
  },
  {
    name: "Closets",
    image: "/images/closet.png",
    line: "Orden que se revela",
    description: "Almacenaje a medida con luz integrada que descubre cada detalle en el momento justo.",
  },
  {
    name: "Muebles de TV",
    image: "/images/tv-wall.png",
    line: "La tecnología, integrada",
    description: "Paneles y volúmenes que absorben la tecnología dentro de la arquitectura, sin ruido visual.",
  },
  {
    name: "Puertas",
    image: "/images/door-detail.png",
    line: "Transiciones con intención",
    description: "El paso entre un espacio y otro, tratado como una pieza de diseño y no como un simple umbral.",
  },
]

export function Services() {
  return (
    <section id="espacios">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center lg:px-10">
        <p className="eyebrow mb-6 text-muted-foreground">Espacios</p>
        <h2 className="display-lg mx-auto max-w-3xl text-balance font-display text-foreground">
          Un mismo lenguaje. Cuatro maneras de habitarlo.
        </h2>
      </div>

      {services.map((service, i) => (
        <ServicePanel key={service.name} service={service} index={i} />
      ))}
    </section>
  )
}

function ServicePanel({
  service,
  index,
}: {
  service: (typeof services)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Parallax: background image moves slower than the panel for depth.
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1, 1.15])

  return (
    <div ref={ref} className="relative h-[90svh] w-full overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0 -top-[12%] h-[124%]">
        <img
          src={service.image || "/placeholder.svg"}
          alt={`${service.name} a medida diseñados por Tonfort`}
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#050a12]/85 via-[#050a12]/20 to-[#050a12]/40" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-20 lg:px-10 lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="font-mono text-sm text-white/60">{String(index + 1).padStart(2, "0")}</span>
          <p className="mt-3 text-pretty text-lg text-white/70">{service.line}</p>
          <h3 className="display-lg mt-1 font-display text-white">{service.name}</h3>
          <p className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-white/80">
            {service.description}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
