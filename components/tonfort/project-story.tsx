"use client"

import { useRef, useState } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import type { Project } from "@/lib/db/schema"

type SerializedProject = Omit<Project, "createdAt"> & { createdAt: string }

/**
 * A single project told as an immersive, Apple-style chapter.
 * The imagery "wakes up" with light as it enters the viewport, and the
 * story text drifts in beside a cinematic media block that holds the video.
 */
export function ProjectStory({ project, index }: { project: SerializedProject; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  // Light handling: the media block starts in shadow and brightens as it centers.
  const brightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1.08, 0.7])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 1.04])
  const glow = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 0.5, 0.1])
  const textY = useTransform(scrollYProgress, [0, 1], [60, -60])

  const number = String(index + 1).padStart(2, "0")

  return (
    <section
      ref={ref}
      className="relative border-t border-border py-24 first:border-t-0 lg:py-36"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
        {/* Media block with light animation */}
        <div className={index % 2 === 0 ? "lg:col-span-7 lg:order-1" : "lg:col-span-7 lg:order-2"}>
          <div className="relative overflow-hidden rounded-xl bg-[#050a12]">
            <motion.div
              style={{ opacity: glow }}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cream blur-[120px]"
            />
            <ProjectMedia project={project} brightness={brightness} scale={scale} />
          </div>
        </div>

        {/* Story text */}
        <motion.div
          style={{ y: textY }}
          className={index % 2 === 0 ? "lg:col-span-5 lg:order-2" : "lg:col-span-5 lg:order-1"}
        >
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-sm text-brand-blue-mid">{number}</span>
            <span className="eyebrow text-muted-foreground">{project.category ?? "Proyecto"}</span>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="display-md mt-5 text-balance font-display text-foreground"
          >
            {project.title}
          </motion.h2>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {project.location && <span>{project.location}</span>}
            {project.year && <span>{project.year}</span>}
          </div>

          {project.summary && (
            <p className="mt-6 text-pretty text-lg leading-relaxed text-foreground/80">{project.summary}</p>
          )}

          {project.story && (
            <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">{project.story}</p>
          )}
        </motion.div>
      </div>
    </section>
  )
}

function ProjectMedia({
  project,
  brightness,
  scale,
}: {
  project: SerializedProject
  brightness: ReturnType<typeof useTransform<number, number>>
  scale: ReturnType<typeof useTransform<number, number>>
}) {
  const [playing, setPlaying] = useState(false)
  const cover = project.coverImage || "/images/proyecto-poster.png"

  if (project.videoUrl && playing) {
    return (
      <div className="aspect-[16/10] w-full">
        <video
          src={project.videoUrl}
          poster={cover}
          controls
          autoPlay
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="relative aspect-[16/10] w-full">
      <motion.img
        src={cover}
        alt={`${project.title} — proyecto de Tonfort`}
        style={{ filter: useTransform(brightness, (b) => `brightness(${b})`), scale }}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a12]/50 via-transparent to-transparent" />

      {project.videoUrl ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Reproducir video de ${project.title}`}
          className="group absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#0a1f33] shadow-lg transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      ) : (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-white/80 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-blue-light" />
          Video próximamente
        </div>
      )}
    </div>
  )
}
