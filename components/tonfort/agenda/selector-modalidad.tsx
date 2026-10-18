"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { Check, Laptop, MapPin, ArrowRight } from "lucide-react"
import { formatPrecio } from "@/lib/agenda-format"
import { cn } from "@/lib/utils"
import type { ProyectoResumen } from "@/lib/portfolio-service"

// Resumen en texto de lo que explica el video. Vive aquí porque es el fallback
// cuando el video no carga o la persona pidió menos movimiento.
const RESUMEN_VIDEO = [
  "Una cita virtual es una videollamada con tu diseñador: sin costo y desde donde estés.",
  "Una visita presencial va a tu domicilio, con toma de medidas y diagnóstico del espacio.",
  "Las citas duran una hora y media.",
  "En ambos casos el siguiente paso es el mismo: elegir día y hora.",
]

export interface ModalidadOpcion {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  costo: number
  duracion_minutos: number
  bullets: string[]
  etiqueta?: string
  icono: "laptop" | "map"
}

const ICONOS = { laptop: Laptop, map: MapPin }

export function SelectorModalidad({
  opciones,
  proyectosDestacados,
}: {
  opciones: ModalidadOpcion[]
  proyectosDestacados?: ProyectoResumen[]
}) {
  const [elegida, setElegida] = useState<ModalidadOpcion | null>(null)
  const [videoFallido, setVideoFallido] = useState(false)
  const router = useRouter()
  const reducirMovimiento = useReducedMotion()

  const activa = elegida ?? null

  const proyectosCarrusel = (proyectosDestacados ?? []).slice(0, 3)

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-14">
      {/* Columna izquierda: video o carrusel de respaldo */}
      <div className="lg:col-span-8">
        <div className="overflow-hidden rounded-2xl border border-[#E8DFD0] shadow-[0_16px_32px_rgba(11,29,58,.05),0_4px_12px_rgba(11,29,58,.07)]">
          <div className="aspect-video relative">
            {videoFallido && proyectosCarrusel.length > 0 ? (
              <div className="size-full bg-black flex items-center justify-center overflow-hidden">
                <div className="relative size-full">
                  {proyectosCarrusel.map((p, i) => (
                    <Image
                      key={p.id}
                      src={p.portada_url ?? "/tonfort-closet-render.png"}
                      alt={p.titulo}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                      priority={i === 0}
                      className="absolute inset-0 size-full object-cover transition-opacity duration-500 ease-in-out"
                      style={{
                        opacity: i === 0 ? 1 : 0,
                        pointerEvents: i === 0 ? "auto" : "none",
                      }}
                    />
                  ))}
                  <button
                    onClick={() => setVideoFallido(false)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                    aria-label="Volver a intentar video"
                  >
                    <ArrowRight className="size-4 rotate-90" />
                  </button>
                </div>
              </div>
            ) : (
              <video
                src="/agenda/modalidades.mp4"
                poster="/agenda/modalidades-poster.png"
                autoPlay={!reducirMovimiento}
                muted
                loop
                playsInline
                controls={reducirMovimiento ?? false}
                preload="metadata"
                aria-label="Qué es una cita virtual y qué es una visita presencial"
                className="size-full bg-black object-cover"
                onError={() => setVideoFallido(true)}
              />
            )}
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {RESUMEN_VIDEO.map((linea, i) => (
            <motion.li
              key={linea}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-3 text-sm leading-6 text-[#0B1D3A]/70"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2856c7]" aria-hidden />
              {linea}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Columna derecha: selección */}
      <div className="mt-12 lg:col-span-4 lg:mt-0">
        {/* Es UI, no display: Montserrat pesado, no Arvo (§14.2 del design system). */}
        <h1 className="font-sans text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0B1D3A] md:text-5xl">
          ¿Cómo quieres empezar?
        </h1>
        <p className="mt-4 text-base leading-7 text-[#0B1D3A]/70">
          Elige una modalidad. Después eliges día y hora.
        </p>

        <div className="mt-8 space-y-4">
          {opciones.map((opcion) => {
            const Icono = ICONOS[opcion.icono]
            const esActiva = activa?.id === opcion.id

            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => setElegida(opcion)}
                aria-pressed={esActiva}
                className={cn(
                  "relative w-full rounded-2xl border p-5 text-left transition-all duration-200 ease-out",
                  esActiva
                    ? "border-[#2856c7] bg-[#2856c7]/[.04] ring-1 ring-[#2856c7]"
                    : "border-border bg-white hover:border-[#0B1D3A]/30",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        esActiva ? "bg-[#2856c7] text-white" : "bg-[#F7F4EE] text-[#0B1D3A]",
                      )}
                    >
                      <Icono className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-[#0B1D3A]">{opcion.nombre}</p>
                      <p className="text-sm text-[#0B1D3A]/60">
                        {formatPrecio(opcion.costo)} · {opcion.duracion_minutos} min
                      </p>
                    </div>
                  </div>

                  {esActiva ? (
                    <Check className="size-5 shrink-0 text-[#2856c7]" aria-hidden />
                  ) : (
                    opcion.etiqueta && (
                      <span className="shrink-0 rounded-full bg-[#F7F4EE] px-3 py-1 text-xs text-[#0B1D3A]/70">
                        {opcion.etiqueta}
                      </span>
                    )
                  )}
                </div>

                <ul className="mt-4 space-y-1.5">
                  {opcion.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-sm leading-6 text-[#0B1D3A]/70"
                    >
                      <span className="mt-2.5 size-1 shrink-0 rounded-full bg-[#0B1D3A]/30" aria-hidden />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => activa && router.push(`/agenda/horario?modalidad=${activa.slug}`)}
          disabled={!activa}
          className={cn(
            "mt-8 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 ease-out",
            activa
              ? "bg-[#2856c7] text-white hover:bg-[#1c46a8] active:scale-[.98]"
              : "cursor-not-allowed bg-[#0B1D3A]/15 text-[#0B1D3A]/45",
          )}
        >
          Continuar
          <ArrowRight className="size-4" />
        </button>

        <p className="mt-4 text-center text-xs text-[#0B1D3A]/50">
          Sin compromiso de compra.
        </p>
      </div>
    </div>
  )
}
