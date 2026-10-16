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

// Las 12 mejores fotos del archivo EyDiseños (Bogotá), elegidas entre 41
// originales midiendo nitidez, brillo, contraste y encuadre. Todas recortadas a
// 21:9 —la relación real del contenedor— en `public/historia/carrusel/`.
const SLIDES: ProjectSlide[] = [
  {
    id: "altillo",
    src: "/historia/carrusel/01.jpg",
    alt: "Instalación bajo el altillo del taller en Bogotá",
    caption: "El taller bajo el altillo",
  },
  {
    id: "luz",
    src: "/historia/carrusel/02.jpg",
    alt: "Módulos de almacenamiento bajo un cielo raso de madera iluminado",
    caption: "La luz del taller",
  },
  {
    id: "union",
    src: "/historia/carrusel/03.jpg",
    alt: "Detalle de cajones abiertos mostrando las correderas",
    caption: "La unión que no se ve",
  },
  {
    id: "galera",
    src: "/historia/carrusel/04.jpg",
    alt: "Cocina galera con muebles blancos y de madera junto a una ventana",
    caption: "Cocina galera",
  },
  {
    id: "calida",
    src: "/historia/carrusel/05.jpg",
    alt: "Cocina de madera oscura con encimera clara",
    caption: "Cocina cálida",
  },
  {
    id: "encimera",
    src: "/historia/carrusel/06.jpg",
    alt: "Encimera de cocina con muebles de madera y salpicadero de vidrio",
    caption: "La encimera",
  },
  {
    id: "puertas",
    src: "/historia/carrusel/07.jpg",
    alt: "Armario de puertas corredizas de madera con repisas y cajones",
    caption: "Puertas corredizas",
  },
  {
    id: "armario",
    src: "/historia/carrusel/08.jpg",
    alt: "Armario alto de madera clara con repisas abiertas",
    caption: "Armario alto",
  },
  {
    id: "mueble-medios",
    src: "/historia/carrusel/09.jpg",
    alt: "Mueble de medios y cajonera blanca instalados en una habitación",
    caption: "Lo que salía del banco",
  },
  {
    id: "sala",
    src: "/historia/carrusel/10.jpg",
    alt: "Muro de entretenimiento en madera con repisas junto a una ventana",
    caption: "El muro de la sala",
  },
  {
    id: "estudio",
    src: "/historia/carrusel/11.jpg",
    alt: "Mueble de estudio con repisas y cajonera junto a una ventana",
    caption: "El rincón de estudio",
  },
  {
    id: "isla",
    src: "/historia/carrusel/12.jpg",
    alt: "Isla de cocina moderna en blanco y gris con franja roja",
    caption: "La isla",
  },
]

const SLIDE_DURATION = 7000

export function HistoriaCarousel() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
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
        setDirection(1)
        setCurrent((prev) => (prev + 1) % SLIDES.length)
        setProgress(0)
        startTimeRef.current = Date.now()
      }
    }, 50)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, current])

  const goToSlide = (index: number, dir: number) => {
    setDirection(dir)
    setCurrent(index)
    setProgress(0)
    startTimeRef.current = Date.now()
  }

  const prev = () => goToSlide((current - 1 + SLIDES.length) % SLIDES.length, -1)
  const next = () => goToSlide((current + 1) % SLIDES.length, 1)

  return (
    <section className="relative mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl border border-[#E8DFD0] bg-[#E8DFD0] shadow-[0_30px_80px_-40px_rgba(11,29,58,.45)]">
        <div className="relative aspect-[16/9] md:aspect-[21/9]">
          {/* Desplazamiento horizontal, sin desvanecimiento: la foto entrante
          empuja a la saliente y la dirección la marca el botón pulsado. */}
          <AnimatePresence>
            {/* Curva suave (entrada y salida progresivas) y 0,9 s: con la expo
            de 0,6 s el desplazamiento arrancaba de golpe y frenaba en seco, y
            se leía como un tirón. */}
            <motion.div
              key={SLIDES[current].id}
              data-motion-reveal=""
              initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? "-100%" : "100%", opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
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
                  onClick={() => goToSlide(idx, idx > current ? 1 : -1)}
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