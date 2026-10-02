"use client"

import Image from "next/image"
import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { ButtonLink, GradientText } from "@/components/tonfort/public-animations"
import { HERO } from "@/content/landing"

// Overlay en dos capas: un glow de marca al este y un scrim horizontal que
// protege el texto de la izquierda sin aplanar la imagen de la derecha.
const OVERLAY =
  "absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(55,105,230,.18),transparent_25%),linear-gradient(90deg,#000_0%,rgba(0,0,0,.92)_26%,rgba(0,0,0,.12)_70%,#000_100%)]"

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  // El texto sale hacia arriba y se apaga; la imagen hace un push-in lento.
  const y = useTransform(scrollYProgress, [0, 1], [0, 90])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  // `object-position` no es animable vía style tipado: lo movemos con una
  // variable CSS que la imagen consume.
  const heroObjectPosition = useTransform(scrollYProgress, [0, 1], ["50% 50%", "50% 62%"])

  return (
    <section ref={ref} className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-black">
      <motion.div
        data-motion-reveal=""
        style={
          {
            scale,
            "--hero-object-position": heroObjectPosition,
          } as unknown as React.CSSProperties
        }
        className="absolute inset-0"
      >
        <Image
          src="/tonfort-hero-wall.png"
          alt="Mueble de TV Tonfort con iluminación integrada"
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: "var(--hero-object-position, 50% 50%)" }}
          className="object-cover"
        />
      </motion.div>
      <div className={OVERLAY} />
      <div className="tonfort-led-glow absolute left-[60%] top-[34%] size-32 rounded-full" />

      <motion.div
        data-motion-reveal=""
        style={{ y, opacity }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-24 md:px-10"
      >
        <div className="grid items-end gap-10 md:grid-cols-12">
          {/* Columna izquierda: la identidad */}
          <div className="md:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 text-xs uppercase tracking-[0.34em] text-[#3769e6]"
            >
              {HERO.eyebrow}
            </motion.p>

            <h1 className="text-[clamp(3.5rem,9vw,8.5rem)] font-medium leading-[0.88] tracking-[-0.08em] text-white">
              {HERO.tituloLineas.map((linea, i) => (
                <span key={linea} className="block">
                  {i >= HERO.tituloGradienteDesdeLinea ? (
                    <GradientText>{linea}</GradientText>
                  ) : (
                    linea
                  )}
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 max-w-sm text-base leading-7 text-[#a1a1a6]"
            >
              {HERO.bajada}
            </motion.p>

            {/* En mobile el CTA va debajo de la bajada, a ancho completo. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 md:hidden"
            >
              <ButtonLink
                href="/agenda/modalidad"
                variant="vivid"
                size="lg"
                ariaLabel="Agendar cita"
                className="w-full"
              >
                {HERO.cta}
              </ButtonLink>
              <p className="mt-3 text-center text-xs text-[#a1a1a6]/70">{HERO.microcopy}</p>
            </motion.div>

            <div className="mt-8 hidden md:block">
              <ButtonLink href="/portafolio/santa-marta" primary={false}>
                {HERO.ctaSecundaria}
              </ButtonLink>
            </div>
          </div>

          {/* Columna derecha: el CTA, siempre visible sin hover */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4 md:col-start-9 md:justify-self-end md:text-right"
          >
            <ButtonLink
              href="/agenda/modalidad"
              variant="vivid"
              size="lg"
              ariaLabel="Agendar cita"
              className="hidden md:inline-flex"
            >
              {HERO.cta}
            </ButtonLink>
            <p className="mt-3 hidden text-xs text-[#a1a1a6]/70 md:block">{HERO.microcopy}</p>
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-8 right-8 hidden text-[9px] uppercase tracking-[0.35em] text-white/35 md:block">
        Desliza para explorar
      </div>
    </section>
  )
}
