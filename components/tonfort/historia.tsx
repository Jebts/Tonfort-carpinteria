"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Reveal } from "./reveal"

function Chapter({
  index,
  eyebrow,
  title,
  children,
  image,
  imageAlt,
  reverse = false,
}: {
  index: string
  eyebrow: string
  title: string
  children: React.ReactNode
  image: string
  imageAlt: string
  reverse?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const brightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1.05, 0.75])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.03])

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={reverse ? "lg:order-2" : "lg:order-1"}>
          <div className="relative overflow-hidden rounded-xl bg-brand-navy/10">
            <motion.img
              src={image}
              alt={imageAlt}
              style={{ filter: useTransform(brightness, (b) => `brightness(${b})`), scale }}
              className="aspect-[4/5] h-full w-full object-cover"
            />
          </div>
        </div>

        <div className={reverse ? "lg:order-1" : "lg:order-2"}>
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-sm text-brand-blue-mid">{index}</span>
            <span className="eyebrow text-muted-foreground">{eyebrow}</span>
          </div>
          <Reveal>
            <h2 className="display-md mt-5 text-balance font-display text-foreground">{title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-6 space-y-5 text-pretty text-lg leading-relaxed text-foreground/80">
              {children}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function Historia() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const heroBrightness = useTransform(scrollYProgress, [0, 1], [1, 0.5])
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -80])

  return (
    <div className="bg-background">
      {/* Cinematic hero */}
      <section ref={heroRef} className="relative h-[100svh] w-full overflow-hidden">
        <motion.div style={{ scale: heroScale, filter: useTransform(heroBrightness, (b) => `brightness(${b})`) }} className="absolute inset-0">
          <img
            src="/images/historia-fundadores.png"
            alt="Edwin y Yecenia, fundadores de Tonfort, en su taller iluminado por la luz de la tarde"
            className="h-full w-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a12]/85 via-[#050a12]/20 to-[#050a12]/40" aria-hidden />

        <motion.div
          style={{ y: heroTextY }}
          className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-24 lg:px-10 lg:pb-28"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow mb-6 text-white/70"
          >
            Nuestra historia
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="display-xl max-w-4xl text-balance font-display text-white"
          >
            Una familia que aprendió a diseñar el hogar diseñando el suyo.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-white/85"
          >
            Doce años de oficio, una pausa que nos enseñó a empezar de nuevo y tres hijos que
            volvieron a encender la chispa. Esto es Tonfort.
          </motion.p>
        </motion.div>
      </section>

      {/* Intro statement */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-10 lg:py-32">
        <Reveal>
          <p className="display-lg text-balance font-display text-foreground">
            No heredamos un negocio. Heredamos una forma de mirar los espacios: con paciencia,
            con oficio y con amor.
          </p>
        </Reveal>
      </section>

      <Chapter
        index="01"
        eyebrow="El origen · Bogotá"
        title="Dos talentos, un mismo sueño."
        image="/images/historia-manos.png"
        imageAlt="Manos experimentadas lijando una pieza de madera en el taller"
      >
        <p>
          Hace doce años, en Bogotá, Edwin Bustos y Yecenia Tamayo decidieron unir lo que mejor
          sabían hacer. Edwin, con su pasión por el diseño industrial y la arquitectura, tomó las
          riendas de la ideación creativa; Yecenia, con su experiencia en mercadeo, dio forma a la
          administración y la logística.
        </p>
        <p>
          Así nació EyDiseños. Lo levantaron con esfuerzo mientras construían algo aún más
          importante: un hogar y tres hijos —Santiago, Natalia y Esteban— que crecieron entre
          planos, aserrín y sobremesas de trabajo.
        </p>
      </Chapter>

      {/* Quote band — warm */}
      <section className="bg-brand-cream">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10 lg:py-32">
          <Reveal>
            <p className="display-md text-balance font-display text-[#0a1f33]">
              &ldquo;Crecer no fue solo hacer más muebles. Fue aprender qué significa cuidar de un
              espacio y de las personas que lo habitan.&rdquo;
            </p>
          </Reveal>
        </div>
      </section>

      <Chapter
        index="02"
        eyebrow="La pausa · Santa Marta"
        title="Cerrar puertas para poder volver a abrirlas."
        image="/images/historia-familia.png"
        imageAlt="La familia reunida trabajando en el taller junto al mar"
        reverse
      >
        <p>
          Con el tiempo llegaron desafíos económicos y personales que exigieron una decisión
          difícil: cerrar las puertas en la capital y emprender un nuevo comienzo, en familia, hacia
          Santa Marta.
        </p>
        <p>
          No fue un final. Fue una pausa. El oficio quedó en reposo, pero la manera de mirar los
          espacios siguió viva en cada uno de nosotros, esperando el momento de volver.
        </p>
      </Chapter>

      <Chapter
        index="03"
        eyebrow="El reencuentro"
        title="La chispa la reencendieron los hijos."
        image="/images/historia-fundadores.png"
        imageAlt="Los fundadores de Tonfort de nuevo en el taller"
      >
        <p>
          Dos años después del cierre, Santiago y Esteban empezaron a desarrollar sus propios
          proyectos. Esa energía fue el empujón que faltaba: la familia volvió a reencontrarse con su
          vocación.
        </p>
        <p>
          A la trayectoria de los fundadores se sumó el talento, la energía y el compromiso de una
          nueva generación. Ya no era solo el sueño de dos: era el proyecto de toda una familia.
        </p>
      </Chapter>

      {/* Family members */}
      <section className="bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <Reveal>
            <p className="eyebrow mb-6 text-white/60">Hoy · La Perla de América</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-lg max-w-3xl text-balance font-display">
              Tonfort reabre sus puertas, fortalecida por su gente.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-white/75">
              Desde Santa Marta, la experiencia de los fundadores se une a la fuerza de tres hijos que
              hoy son el corazón del taller. Una verdadera empresa familiar, impulsada por el amor, la
              resiliencia y el diseño.
            </p>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { name: "Santiago", age: "24 años", role: "Diseño y ejecución" },
              { name: "Natalia", age: "20 años", role: "Experiencia y detalle" },
              { name: "Esteban", age: "17 años", role: "Nuevas ideas" },
            ].map((m, i) => (
              <Reveal key={m.name} delay={0.1 * i} className="bg-brand-navy p-8">
                <p className="font-display text-3xl font-medium">{m.name}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-brand-blue-light">
                  {m.age}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/70">{m.role}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10 lg:py-32">
        <Reveal>
          <p className="eyebrow mb-8 text-muted-foreground">Lo que nos sostiene</p>
        </Reveal>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {["Amor", "Resiliencia", "Diseño"].map((word, i) => (
            <Reveal key={word} delay={0.12 * i}>
              <span className="display-md font-display text-foreground">{word}</span>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}
