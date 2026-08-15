"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "motion/react"
import { Reveal } from "./reveal"
import type { Project } from "@/lib/db/schema"

type SerializedProject = Omit<Project, "createdAt"> & { createdAt: string }

export function ProyectosView({ projects }: { projects: SerializedProject[] }) {
  return (
    <div className="bg-background">
      <ProyectosHero />
      <ProyectosVideo />

      <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-10">
        {projects.length === 0 ? (
          <p className="py-24 text-center text-muted-foreground">
            Pronto publicaremos nuestros proyectos aquí.
          </p>
        ) : (
          <div className="flex flex-col gap-32 lg:gap-48">
            {projects.map((project, i) => (
              <ProjectBlock key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center lg:px-10">
          <Reveal>
            <p className="eyebrow mb-6 text-brand-blue">¿Tu espacio es el siguiente?</p>
            <h2 className="display-md text-balance font-display text-foreground">
              Diseñemos juntos la próxima historia.
            </h2>
            <Link
              href="/agenda"
              className="mt-10 inline-block rounded-full bg-primary px-8 py-3.5 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
            >
              Agendar una cita
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

function ProyectosHero() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-40 lg:px-10 lg:pt-48">
      <Reveal>
        <p className="eyebrow mb-8 text-brand-blue">Portafolio</p>
        <h1 className="display-xl max-w-4xl text-balance font-display text-foreground">
          Espacios que se recuerdan.
        </h1>
        <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Cada proyecto empieza con una pregunta: cómo se vive este lugar. Estas son algunas de las
          respuestas que hemos construido en madera, luz y detalle.
        </p>
      </Reveal>
    </section>
  )
}

function ProyectosVideo() {
  const [playing, setPlaying] = useState(false)

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
      <Reveal>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#050a12]">
          <video
            className="h-full w-full object-cover"
            poster="/images/proyecto-poster.png"
            controls={playing}
            preload="none"
            playsInline
          >
            {/* Espacio para el video institucional. Sube el archivo a /public/videos/ y referencia aquí. */}
            <source src="/videos/tonfort-reel.mp4" type="video/mp4" />
          </video>

          {!playing && (
            <button
              type="button"
              onClick={(e) => {
                setPlaying(true)
                const video = e.currentTarget.parentElement?.querySelector("video")
                video?.play().catch(() => {})
              }}
              className="group absolute inset-0 flex flex-col items-center justify-center bg-[#050a12]/40 transition-colors hover:bg-[#050a12]/25"
              aria-label="Reproducir video"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/40 backdrop-blur-sm transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="mt-6 font-mono text-xs uppercase tracking-widest text-white/80">
                Ver el proceso
              </span>
            </button>
          )}
        </div>
      </Reveal>
    </section>
  )
}

function ProjectBlock({ project, index }: { project: SerializedProject; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })

  // The image "lights up" as it moves through the viewport, then dims on exit.
  const brightness = useTransform(scrollYProgress, [0, 0.45, 0.9], [0.55, 1.05, 0.7])
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1])
  const filter = useTransform(brightness, (b) => `brightness(${b})`)

  const reversed = index % 2 === 1

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16"
    >
      <div className={reversed ? "lg:order-2 lg:col-span-7" : "lg:col-span-7"}>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#050a12]">
          {project.coverImage ? (
            <motion.img
              src={project.coverImage}
              alt={`${project.title} — ${project.category ?? "proyecto"} en ${project.location ?? "Tonfort"}`}
              style={{ scale, filter }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              <span className="font-mono text-xs uppercase tracking-widest">Sin imagen</span>
            </div>
          )}
        </div>
      </div>

      <div className={reversed ? "lg:order-1 lg:col-span-5" : "lg:col-span-5"}>
        <Reveal>
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-brand-blue">
            {project.category && <span>{project.category}</span>}
            {project.year && (
              <>
                <span className="h-1 w-1 rounded-full bg-brand-blue/50" />
                <span>{project.year}</span>
              </>
            )}
          </div>
          <h2 className="mt-5 display-md text-balance font-display text-foreground">{project.title}</h2>
          {project.location && (
            <p className="mt-3 text-sm text-muted-foreground">{project.location}</p>
          )}
          {project.summary && (
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              {project.summary}
            </p>
          )}
          {project.story && (
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground/80">{project.story}</p>
          )}
        </Reveal>
      </div>
    </div>
  )
}
