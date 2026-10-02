"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"

interface ProjectSlide {
  id: string
  src: string
  alt: string
  caption: string
}

// Proyectos de la época en Bogotá (fotos pendientes de incluir en /public).
const SLIDES: ProjectSlide[] = [
  {
    id: "bogota-01",
    src: "/history-installation.jpg",
    alt: "Instalación de un mueble Tonfort",
    caption: "Instalación en Bogotá",
  },
  {
    id: "bogota-02",
    src: "/history-first-build.jpg",
    alt: "Primeros muebles fabricados",
    caption: "Los primeros muebles",
  },
  {
    id: "bogota-03",
    src: "/history-founders.jpg",
    alt: "Equipo de trabajo en el taller",
    caption: "El banco de trabajo",
  },
  {
    id: "bogota-04",
    src: "/history-workshop-light.png",
    alt: "Taller con iluminación",
    caption: "El taller, la luz y la madera",
  },
]

const SLIDE_DURATION = 7000

export function HistoriaCarousel() {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    startTimeRef.current = Date.now() - (progress / 100) * SLIDE_DURATION
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(newProgress)
      if (newProgress >= 100) {
        setCurrent((prev) => (prev + 1) % SLIDES.length)
        setProgress(0)
        startTimeRef.current = Date.now()
      }
    }, 50)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, current])

  const goToSlide = (index: number) => {
    setCurrent(index)
    setProgress(0)
    startTimeRef.current = Date.now()
  }

  const prev = () => goToSlide((current - 1 + SLIDES.length) % SLIDES.length)
  const next = () => goToSlide((current + 1) % SLIDES.length)

  return (
    <section className="relative mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl border border-[#E8DFD0] bg-[#E8DFD0] shadow-[0_30px_80px_-40px_rgba(11,29,58,.45)]">
        <div className="relative aspect-[16/9] md:aspect-[21/9]">
          <AnimatePresence mode="wait">
            <motion.div
              key={SLIDES[current].id}
              data-motion-reveal=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <img
                src={SLIDES[current].src}
                alt={SLIDES[current].alt}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/85 md:text-base">
                  {SLIDES[current].caption}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controles */}
          <div className="absolute inset-y-0 left-0 flex items-center">
            <button
              type="button"
              onClick={prev}
              aria-label="Proyecto anterior"
              className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              onClick={next}
              aria-label="Proyecto siguiente"
              className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Barra de progreso + play/pause */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center gap-3 px-6 md:px-10">
            <div className="flex items-center gap-2">
              {SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Ir a ${slide.caption}`}
                  className="group relative h-1.5 w-8 overflow-hidden rounded-full bg-white/25 transition-all md:w-12"
                >
                  {current === idx ? (
                    <motion.div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-white"
                    />
                  ) : idx < current ? (
                    <div className="h-full w-full bg-white/70" />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pausar carrusel" : "Reanudar carrusel"}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}