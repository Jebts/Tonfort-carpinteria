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
        {/* Título arriba, CTAs en su propia fila centrada debajo. */}
        <div className="md:-mt-6">
          <h1 className="display-xl font-display text-white">
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
        </div>

        {/* Un solo bloque de CTAs: antes se duplicaba en `md:hidden` y en la
            columna derecha, cuatro nodos `motion` para los mismos dos botones. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 flex flex-col items-center gap-3 md:mt-24"
        >
          <ButtonLink
            href="/agenda/modalidad"
            variant="vivid"
            size="lg"
            ariaLabel="Agendar cita"
          >
            {HERO.cta}
          </ButtonLink>
          <ButtonLink href="/portafolio" primary={false}>
            {HERO.ctaSecundaria}
          </ButtonLink>
        </motion.div>
      </motion.div>
    </section>
  )
}
