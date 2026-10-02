"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { ArrowUpRight } from "lucide-react"

export function Reveal({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.2"],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.35, 1], [0, 1, 1])
  const y = useTransform(scrollYProgress, [0, 1], [42, 0])
  const blur = useTransform(scrollYProgress, [0, 0.35], ["10px", "0px"])
  return (
    <motion.div
      ref={ref}
      data-motion-reveal=""
      style={{ opacity, y, filter: blur }}
      transition={{ ease: [0.16, 1, 0.3, 1] }}
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

export function ParallaxImage({
  src,
  alt,
  className = "",
}: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.img src={src} alt={alt} style={{ y, scale: 1.16 }} className="size-full object-cover" />
    </div>
  )
}

export function CinematicBand({
  src,
  eyebrow,
  title,
  copy,
  align = "left",
  tone = "dark",
}: {
  src: string
  eyebrow: string
  title: string
  copy: string
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
  const scrim =
    tone === "light"
      ? align === "left"
        ? "bg-gradient-to-r from-[#F7F4EE]/92 via-[#F7F4EE]/78 to-[#F7F4EE]/34"
        : "bg-gradient-to-l from-[#F7F4EE]/92 via-[#F7F4EE]/78 to-[#F7F4EE]/34"
      : align === "left"
        ? "bg-gradient-to-r from-black via-black/70 to-black/15"
        : "bg-gradient-to-l from-black via-black/70 to-black/15"
  const radial =
    tone === "light"
      ? "bg-[radial-gradient(circle_at_70%_45%,rgba(40,86,199,.10),transparent_30%)]"
      : "bg-[radial-gradient(circle_at_70%_45%,rgba(55,105,230,.08),transparent_28%)]"
  return (
<section ref={ref} className={`relative min-h-[70vh] overflow-hidden md:min-h-[78vh] ${tone === "light" ? "bg-[#F7F4EE]" : "bg-black"}`}>
      <motion.img data-motion-reveal="" src={src} alt={eyebrow} style={{ scale, y }} className="absolute inset-0 size-full object-cover" />
      <div className={`absolute inset-0 ${scrim}`} />
      <div className={`absolute inset-0 ${radial}`} />
      <motion.div
        data-motion-reveal=""
        style={{ x }}
        className={`relative z-10 flex min-h-[70vh] items-center px-5 py-16 md:min-h-[78vh] md:px-10 md:py-24 ${align === "right" ? "justify-end text-right" : ""}`}
      >
        <div className="max-w-xl">
          <p className={`text-[10px] uppercase tracking-[.34em] ${tone === "light" ? "text-[#2856c7] drop-shadow-[0_1px_10px_rgba(247,244,238,.85)]" : "text-[#f4d6a0]"}`}>{eyebrow}</p>
          <h2 className={`mt-4 text-4xl leading-[.94] tracking-[-.07em] md:text-8xl md:leading-[.92] ${tone === "light" ? "text-[#0B1D3A] drop-shadow-[0_2px_24px_rgba(247,244,238,.9)]" : "text-white"}`}>
            <GradientText tone={tone}>{title}</GradientText>
          </h2>
          <p className={`mt-5 max-w-md text-sm leading-6 md:text-base ${tone === "light" ? "text-[#0B1D3A]/90 drop-shadow-[0_1px_12px_rgba(247,244,238,.85)]" : "text-[#a1a1a6]"}`}>{copy}</p>
        </div>
      </motion.div>
    </section>
  )
}

export function LightDetail({
  detail,
  index,
}: {
  detail: { src: string; label: string; title: string; copy: string }
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.88, 1, 0.92])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [
    index % 2 ? 36 : -36,
    0,
    index % 2 ? -24 : 24,
  ])
  return (
    <div ref={ref} className="relative min-h-[85vh] overflow-hidden">
      <motion.img data-motion-reveal="" src={detail.src} alt={detail.label} style={{ scale, opacity }} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/25 to-black/10" />
      <motion.div
        data-motion-reveal=""
        style={{ x, opacity }}
        className={`relative z-10 flex min-h-[85vh] items-center px-6 py-28 md:px-10 ${index % 2 ? "justify-end text-right" : ""}`}
      >
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[.34em] text-[#f4d6a0]">{detail.label}</p>
          <h3 className="mt-5 text-5xl leading-[.92] tracking-[-.07em] text-white md:text-7xl">{detail.title}</h3>
          <p className="mt-7 max-w-sm text-sm leading-6 text-[#a1a1a6] md:ml-0 md:max-w-md">{detail.copy}</p>
        </div>
      </motion.div>
    </div>
  )
}

export function LightStory() {
  const details = [
    {
      src: "/light-detail-edge.png",
      label: "Luz integrada",
      title: "El detalle que aparece cuando todo lo demás desaparece.",
      copy: "Diseñamos la luz dentro del mueble: precisa, cálida y casi invisible.",
    },
    {
      src: "/light-detail-ceiling.png",
      label: "Luz arquitectónica",
      title: "La atmósfera también se fabrica.",
      copy: "Plafones, líneas y sombras que acompañan el ritmo de cada espacio.",
    },
    {
      src: "/tonfort-hero-plant.png",
      label: "Luz de acento",
      title: "Una pausa. Una planta. Una intención.",
      copy: "La luz convierte el almacenamiento en una experiencia viva.",
    },
  ]
  return <section className="relative">{details.map((detail, index) => <LightDetail key={detail.src} detail={detail} index={index} />)}</section>
}

export function PinnedExplorer() {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.7, 1], [0, 1, 1, 0])
  const [active, setActive] = useState(0)
  const [angle, setAngle] = useState(50)
  const features = [
    { name: "Luz integrada", copy: "La iluminación acompaña cada volumen sin competir con él." },
    { name: "Materiales", copy: "Texturas honestas, elegidas para permanecer." },
    { name: "Proporción", copy: "Cada módulo responde al ritmo del espacio." },
    { name: "Detalle", copy: "Lo esencial aparece cuando te acercas." },
  ]
  const seek = (value: number) => {
    setAngle(value)
    if (videoRef.current && videoRef.current.duration)
      videoRef.current.currentTime = (videoRef.current.duration * value) / 100
  }
  return (
    <div ref={ref} className="relative h-[calc(100vh+1000px)] w-full bg-[linear-gradient(90deg,#0b0c0e_0%,#242528_18%,#34353a_50%,#242528_82%,#0b0c0e_100%)]">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="relative mx-0 w-full overflow-hidden bg-[#050505] px-4 py-12 md:px-[7vw] md:py-14">
          <div className="mb-8 flex items-end justify-between px-2 md:px-10">
            <div>
              <p className="text-xs uppercase tracking-[.34em] text-[#3769e6]">Visor 3D</p>
              <h3 className="mt-4 text-5xl tracking-[-.07em] text-white md:text-7xl">Explora en 3D</h3>
            </div>
            <span className="hidden text-sm text-[#747780] md:block">Observa más de cerca.</span>
          </div>
          <div className="relative aspect-[16/9] overflow-hidden bg-black">
            <video
              ref={videoRef}
              src="/tonfort-model-view.mp4"
              muted
              playsInline
              className="size-full object-cover"
              style={{ objectPosition: `${angle}% 50%` }}
              aria-label="Vista 3D de un mueble Tonfort"
            />
            <div className="absolute inset-y-0 left-5 flex flex-col justify-center gap-3 md:left-10">
              {features.map((feature, i) => (
                <button
                  key={feature.name}
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    active === i
                      ? "bg-white/10 text-white"
                      : "text-[#747780] hover:text-white"
                  }`}
                >
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-xs text-[#747780]">{feature.copy}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex w-full justify-center gap-1.5">
            {features.map((_, i) => (
              <button
                key={i}
                onClick={() => seek((i / (features.length - 1)) * 100)}
                className={`size-2 rounded-full transition-all ${
                  active === i ? "bg-white" : "bg-white/30"
                }`}
                aria-label={`Ir a característica ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      <motion.div
        data-motion-reveal=""
        style={{ opacity }}
        className="relative z-10 py-16 px-6 md:px-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-sm text-[#747780]">
            Arrastra o haz clic en los puntos para explorar el modelo
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export function ProductHero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.25, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 1], [42, -18])
  return (
    <section ref={ref} className="relative h-[125vh] bg-black">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <img src="/tonfort-hero-wall.png" alt="Mueble de TV Tonfort con iluminación integrada" className="absolute inset-0 size-full object-cover object-center" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_46%,rgba(55,105,230,.14),transparent_22%),linear-gradient(90deg,#000_0%,rgba(0,0,0,.9)_28%,rgba(0,0,0,.15)_72%,#000_100%)]" />
        <div className="tonfort-led-glow absolute left-[60%] top-[34%] size-32 rounded-full" />
        <motion.div style={{ opacity, y }} data-motion-reveal="" className="relative z-10 max-w-2xl px-6 md:px-10">
          <p className="mb-6 text-xs uppercase tracking-[.34em] text-[#3769e6]">Tonfort / 01</p>
          <h1 className="text-6xl font-medium leading-[.9] tracking-[-.08em] text-white md:text-[clamp(5rem,9vw,9rem)]">
            Muebles.<br />
            <GradientText>Diseño. Luz.</GradientText>
          </h1>
          <p className="mt-8 max-w-sm text-sm leading-6 text-[#a1a1a6]">
            Diseñamos piezas que transforman la forma de habitar.
          </p>
          <ButtonLink href="/agenda">Agendar una cita</ButtonLink>
        </motion.div>
        <div className="absolute bottom-8 right-8 text-[9px] uppercase tracking-[.35em] text-white/35">
          Desliza para explorar
        </div>
      </div>
    </section>
  )
}

export function BlueFabricPerformance() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.85, 1], [0, 1, 1, 1, 0])
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-60, 0, 55])
  return (
    <section ref={ref} className="relative min-h-[92vh] overflow-hidden bg-black">
      <video src="/tonfort-bubbles.mov" autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover opacity-65 mix-blend-screen" aria-label="Tela azul ondulando con iluminación detrás" />
      <div className="tonfort-fabric absolute inset-[-10%] opacity-35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,#000_76%)]" />
      <motion.div style={{ opacity, x }} data-motion-reveal="" className="relative z-10 flex min-h-[92vh] items-center px-6 md:px-10">
        <div className="max-w-5xl">
          <p className="mb-6 text-xs uppercase tracking-[.34em] text-[#3769e6]">Materia / movimiento</p>
          <h2 className="text-6xl font-medium leading-[.86] tracking-[-.09em] text-white md:text-[clamp(5rem,11vw,11rem)]">
            La luz<br />
            <GradientText>se mueve.</GradientText>
          </h2>
          <p className="mt-8 max-w-sm text-sm leading-6 text-[#9da4bb]">
            Una superficie viva. Una atmósfera que cambia contigo.
          </p>
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
      <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#2856c7]">{eyebrow}</p>
      <h2 className="text-4xl font-medium tracking-[-0.04em] text-[#f5f5f7] md:text-6xl">{title}</h2>
      {description && <p className="mt-5 text-lg leading-7 text-[#86868b]">{description}</p>}
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
        <p className="mb-5 text-xs uppercase tracking-[.34em] text-[#3769e6]">{title === "Portafolio" ? "Proyectos" : "Quiénes somos"}</p>
        <h1 className="max-w-4xl text-6xl font-medium tracking-[-0.07em] text-[#f5f5f7] md:text-8xl">{title}</h1>
        <p className="mt-5 max-w-xl text-lg text-[#a1a1a6]">{description}</p>
      </motion.div>
    </section>
  )
}

// Envoltorios de `CinematicBand` con la imagen y el copy de cada sede del
// portafolio. Los datos viven aquí y no en la página para no duplicarlos.
export const BAND_SEDE: Record<
  "santa_marta" | "bogota",
  { src: string; eyebrow: string; title: string; copy: string }
> = {
  santa_marta: {
    src: "/tonfort-hero-plant.png",
    eyebrow: "Santa Marta",
    title: "Donde la luz llega primero.",
    copy: "El taller y los proyectos que salieron de esta costa.",
  },
  bogota: {
    src: "/history-workshop-light.png",
    eyebrow: "Bogotá",
    title: "Antes de la costa.",
    copy: "Los primeros trabajos, cuando el taller era otro.",
  },
}

/** `vivid` usa el color de marca más saturado (`--royal-bright` = #3769e6),
 *  pensado para el CTA principal del hero y de la navbar. */
export type ButtonVariant = "primary" | "vivid"

const VIVID = "border border-[#3769e6] bg-[#3769e6] text-black hover:bg-[#2856c7] hover:text-white hover:shadow-[0_0_32px_rgba(55,105,230,.45)]"

const VIVID_LIGHT =
  "border border-[#2856c7] bg-[#2856c7] text-white hover:border-[#1c46a8] hover:bg-[#1c46a8] hover:shadow-[0_0_32px_rgba(40,86,199,.25)]"

export function ButtonLink({
  href,
  children,
  primary = true,
  tone = "dark",
  variant = "primary",
  size = "md",
  className = "",
  ariaLabel,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
  tone?: Tone
  variant?: ButtonVariant
  size?: "md" | "lg"
  className?: string
  ariaLabel?: string
}) {
  const sizeClass = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"

  const toneClass = primary
    ? variant === "vivid"
      ? tone === "light"
        ? VIVID_LIGHT
        : VIVID
      : tone === "light"
        ? "border border-[#2856c7] bg-[#2856c7] text-white hover:border-[#1c46a8] hover:bg-[#1c46a8] hover:shadow-[0_0_32px_rgba(40,86,199,.22)]"
        : "border border-[#3769e6] bg-[#3769e6] text-black hover:bg-[#2856c7] hover:text-white hover:shadow-[0_0_32px_rgba(55,105,230,.35)]"
    : tone === "light"
      ? "relative rounded-none px-0 text-[#0B1D3A] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[#2856c7] after:transition-all after:duration-500 hover:text-[#2856c7] hover:after:w-full"
      : "relative rounded-none px-0 text-[#a1a1a6] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-500 hover:text-white hover:after:w-full"

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`group inline-flex items-center justify-center rounded-full font-medium transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[.98] ${
        primary ? sizeClass : "text-sm"
      } ${toneClass} ${className}`}
    >
      {children}
    </Link>
  )
}

export function ProjectCard({
  project,
}: {
  project: { slug?: string; title: string; category: string; image: string; href?: string }
}) {
  const href = project.href ?? `/portafolio/santa-marta/${project.slug}`
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#050505]">
        <motion.img
          src={project.image}
          alt={project.title}
          whileHover={{ scale: 1.07, y: -6 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#f4d6a0]">{project.category}</p>
            <h3 className="mt-1 text-2xl tracking-[-.04em] text-white">{project.title}</h3>
          </div>
          <ArrowUpRight className="size-5 text-white opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  )
}