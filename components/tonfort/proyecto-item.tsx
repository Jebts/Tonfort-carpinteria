"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { Reveal } from "./reveal"
import type { Proyecto } from "@/lib/supabase/types"

// Ítem de proyecto para /proyectos: enfoque Apple-minimalista con reveal por scroll
// y el efecto de "la imagen despierta / la luz se enciende" (brightness/scale),
// coherente con components/tonfort/lighting.tsx.
export function ProyectoItem({ proyecto, indice }: { proyecto: Proyecto; indice: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const brightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1.08, 0.7])
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1])

  const imagen = proyecto.imagen_portada || "/images/placeholder.svg"
  const invertir = indice % 2 === 1

  return (
    <article ref={ref} className="border-t border-border py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <p className="eyebrow text-muted-foreground">
            Proyecto {String(indice + 1).padStart(2, "0")}
          </p>
          <h2 className="display-md mt-6 max-w-3xl text-balance font-display text-foreground">
            {proyecto.titulo}
          </h2>
          {proyecto.resumen && (
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              {proyecto.resumen}
            </p>
          )}
        </Reveal>

        <div
          className={`mt-12 grid items-center gap-12 lg:mt-16 lg:grid-cols-2 ${
            invertir ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            <motion.div
              style={{
                scale,
                filter: useTransform(brightness, (b) => `brightness(${b})`),
              }}
              className="absolute inset-0"
            >
              {/* TODO: reemplazar con fotografía real del proyecto */}
              <img
                src={imagen}
                alt={proyecto.titulo}
                className="h-full w-full object-cover"
              />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <div>
            {proyecto.historia && (
              <Reveal delay={0.1}>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                  {proyecto.historia}
                </p>
              </Reveal>
            )}

            {proyecto.video_url && (
              <Reveal delay={0.2} className="mt-8">
                <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black/90">
                  {proyecto.video_url.includes("youtube") || proyecto.video_url.includes("youtu.be") ? (
                    <iframe
                      src={proyecto.video_url.replace("watch?v=", "embed/")}
                      title={proyecto.titulo}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={proyecto.video_url} controls playsInline className="h-full w-full" />
                  )}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {Array.isArray(proyecto.galeria) && proyecto.galeria.length > 0 && (
          <Reveal delay={0.1} className="mt-12 grid grid-cols-2 gap-4 lg:mt-16 lg:grid-cols-3">
            {proyecto.galeria.map((g, i) => {
              const src = typeof g === "string" ? g : (g as { url?: string })?.url
              if (!src) return null
              return (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                  {/* TODO: reemplazar con fotografía real de la galería */}
                  <img src={src} alt={`${proyecto.titulo} ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              )
            })}
          </Reveal>
        )}
      </div>
    </article>
  )
}
