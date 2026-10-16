"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { ArrowUpRight } from "lucide-react"

// Aparición al entrar en viewport. Usa `whileInView` como el resto de
// primitivas del archivo (`SideReveal`, `WordReveal`, `GradientText`) en vez de
// animar con `useScroll`: el rango `["start 0.9", "end 0.2"]` sobre un bloque
// alto dejaba el contenido con `blur(10px)` y desplazado 42px durante buena
// parte del viewport, que se leía como carga lenta.
export function Reveal({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      data-motion-reveal=""
      initial={{ opacity: 0, y: 42 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SideReveal({
  children,
  side = "left",
}: { children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <motion.div
      data-motion-reveal=""
      initial={{ opacity: 0, x: side === "left" ? -56 : 56, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export type Tone = "dark" | "light"

export function GradientText({
  children,
  className = "",
  tone = "dark",
}: { children: React.ReactNode; className?: string; tone?: Tone }) {
  return (
    <motion.span
      data-motion-reveal=""
      initial={{ opacity: 0.15, backgroundPosition: "100% 50%" }}
      whileInView={{ opacity: 1, backgroundPosition: "0% 50%" }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className={`${tone === "light" ? "tonfort-gradient-light" : "tonfort-gradient"} bg-[length:220%_100%] bg-clip-text text-transparent ${className}`}
    >
      {children}
    </motion.span>
  )
}

export function WordReveal({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ delay: i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mr-[.22em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

// El paralaje se mueve sobre el contenedor, no sobre el `<img>`: `next/image`
// genera un `<img>` con `position:absolute` y un bloque envoltorio propio, y
// transformar el `<img>` lo saca de la composición del padre.
// `hover` añade el zoom `group-hover` que usan las galerías de landing
// (`proyectos-recientes`, `equipo`): va en el `<img>` y no en el `motion.div`
// para no pelear con el `y` del `useScroll`. Constante y no interpolado dentro
// del JSX para que el `className` sea exactamente el mismo en servidor y
// cliente (un template con rama vacía dejaba un espacio final).
const HOVER_IMG =
  "object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"

export function ParallaxImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  hover = false,
}: {
  src: string
  alt: string
  className?: string
  sizes?: string
  hover?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])
  return (
    <div ref={ref} className={`group relative overflow-hidden ${className}`}>
      <motion.div style={{ y, scale: 1.16 }} className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={hover ? HOVER_IMG : "object-cover"}
        />
      </motion.div>
    </div>
  )
}

export function CinematicBand({
  src,
  title,
  eyebrow,
  copy,
  align = "left",
  tone = "dark",
}: {
  src: string
  title: string
  // Opcionales: una banda solo con titular es más editorial que una con
  // antetítulo y bajada apinados.
  eyebrow?: string
  copy?: string
  align?: "left" | "right"
  tone?: Tone
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.06, 0.94])
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"])
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [
    align === "left" ? -45 : 45,
    0,
    align === "left" ? 25 : -25,
  ])
  // El velo claro solo cubre el tercio donde va el texto: el resto de la foto se
  // ve entera. Antes era `from-muted/92 via-muted/78 to-muted/34`, que tapaba
  // la imagen con un muro crema.
  const scrim =
    tone === "light"
      ? align === "left"
        ? "bg-gradient-to-r from-muted/60 via-muted/15 to-transparent"
        : "bg-gradient-to-l from-muted/60 via-muted/15 to-transparent"
      : align === "left"
        ? "bg-gradient-to-r from-black via-black/70 to-black/15"
        : "bg-gradient-to-l from-black via-black/70 to-black/15"
  return (
    <section ref={ref} className={`relative min-h-[70vh] overflow-hidden md:min-h-[78vh] ${tone === "light" ? "bg-muted" : "bg-black"}`}>
      <motion.div
        data-motion-reveal=""
        style={{ scale, y }}
        className="absolute inset-0"
      >
        <Image src={src} alt={title} fill sizes="100vw" className="object-cover" priority />
      </motion.div>
      <div className={`absolute inset-0 ${scrim}`} />
      <motion.div
        data-motion-reveal=""
        style={{ x }}
        className={`relative z-10 flex min-h-[70vh] items-center px-5 py-16 md:min-h-[78vh] md:px-10 md:py-24 ${align === "right" ? "justify-end text-right" : ""}`}
      >
        <div className="max-w-xl [text-shadow:0_1px_24px_rgba(255,255,255,.55)]">
          {eyebrow && (
            <p className={`eyebrow ${tone === "light" ? "text-royal" : "text-warm-light"}`}>
              {eyebrow}
            </p>
          )}
          <h2 className={`display-lg font-display ${eyebrow ? "mt-4 " : ""}${tone === "light" ? "text-white" : "text-white"}`}>
            {tone === "light" ? (
              <span className="text-white [text-shadow:0_2px_24px_rgba(0,0,0,.55)]">{title}</span>
            ) : (
              <GradientText tone={tone}>{title}</GradientText>
            )}
          </h2>
          {copy && (
            <p className={`mt-5 max-w-md text-sm leading-6 md:text-base ${tone === "light" ? "text-brand-navy/90" : "text-copy"}`}>
              {copy}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: { eyebrow?: string; title: string; description?: string }) {
  return (
    <motion.div
      data-motion-reveal=""
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="mb-12 max-w-2xl"
    >
      <p className="eyebrow mb-4 text-royal">{eyebrow}</p>
      <h2 className="display-lg font-display text-brand-white">{title}</h2>
      {description && <p className="mt-5 text-lg leading-7 text-copy">{description}</p>}
    </motion.div>
  )
}

export function PageHero({
  title,
  description,
  image,
}: { title: string; description: string; image?: string }) {
  return (
    <section
      className={`relative flex min-h-[58vh] items-end overflow-hidden px-6 pb-16 pt-32 md:min-h-[70vh] md:px-10 md:pb-24 ${image ? "" : "bg-black"}`}
    >
      {image && (
        <>
          <motion.img
            data-motion-reveal=""
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-black/20" />
        </>
      )}
<motion.div
        data-motion-reveal=""
        initial={{ opacity: 0, y: 42 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-7xl"
      >
        <p className="eyebrow mb-5 text-royal-bright">{title === "Portafolio" ? "Proyectos" : "Quiénes somos"}</p>
        <h1 className="display-xl font-display max-w-4xl text-brand-white">{title}</h1>
        <p className="mt-5 max-w-xl text-lg text-copy">{description}</p>
      </motion.div>
    </section>
  )
}

// Los datos de `BAND_SEDE` viven en `public-data.ts`: este módulo es
// `"use client"` y un Server Component no puede leer un objeto plano
// exportado desde aquí (le llega como referencia de cliente, sin valor).

/** `vivid` usa el color de marca más saturado (`--royal-bright` = #3769e6),
 *  pensado para el CTA principal del hero y de la navbar. */
export type ButtonVariant = "primary" | "vivid"

const VIVID = "border border-royal-bright bg-royal-bright text-black hover:bg-royal hover:text-white hover:shadow-[0_0_32px_rgba(55,105,230,.45)]"

const VIVID_LIGHT =
  "border border-royal bg-royal text-white hover:border-[#1c46a8] hover:bg-[#1c46a8] hover:shadow-[0_0_32px_rgba(40,86,199,.25)]"

export function ButtonLink({
  href,
  children,
  primary = true,
  tone = "dark",
  variant = "primary",
  size = "md",
  className = "",
  ariaLabel,
  target,
  rel,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
  tone?: Tone
  variant?: ButtonVariant
  size?: "md" | "lg"
  className?: string
  ariaLabel?: string
  target?: string
  rel?: string
}) {
  const sizeClass = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"

  const toneClass = primary
    ? variant === "vivid"
      ? tone === "light"
        ? VIVID_LIGHT
        : VIVID
      : tone === "light"
        ? "border border-royal bg-royal text-white hover:border-[#1c46a8] hover:bg-[#1c46a8] hover:shadow-[0_0_32px_rgba(40,86,199,.22)]"
        : "border border-royal-bright bg-royal-bright text-black hover:bg-royal hover:text-white hover:shadow-[0_0_32px_rgba(55,105,230,.35)]"
    : tone === "light"
      ? "relative rounded-none px-0 text-brand-navy after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-royal after:transition-all after:duration-500 hover:text-royal hover:after:w-full"
      : "relative rounded-none px-0 text-copy after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-500 hover:text-white hover:after:w-full"

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      className={`group inline-flex items-center justify-center rounded-full font-medium transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[.98] ${
        primary ? sizeClass : "text-sm"
      } ${toneClass} ${className}`}
    >
      {children}
    </Link>
  )
}

// `aspect-square` para igualar la proporción de `components/tonfort/landing/
// proyectos-recientes.tsx`: las portadas son 1024×1024 (`FALLBACK_PORTADA` y
// los `portada_url` subidos), y el mismo contenido de proyecto se mostraba
// estirado a 4/5 según la página.
export function ProjectCard({
  project,
}: {
  project: { slug?: string; title: string; category: string; image: string; href?: string }
}) {
  const href = project.href ?? `/portafolio/santa-marta/${project.slug}`
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-elevated">
        <motion.div
          whileHover={{ scale: 1.07, y: -6 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
          <div>
            <p className="eyebrow text-warm-light">{project.category}</p>
            <h3 className="mt-1 text-2xl tracking-[-.04em] text-white">{project.title}</h3>
          </div>
          <ArrowUpRight className="size-5 text-white opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  )
}