"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, type MotionValue } from "motion/react"

const text =
  "Creemos que un espacio no se amuebla, se compone. Cada pieza responde a la arquitectura, al recorrido de la luz y a la forma en que vives. Por eso planeamos antes de construir."

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.2"],
  })

  const words = text.split(" ")

  return (
    <section
      id="filosofia"
      ref={ref}
      className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-6 py-32 lg:px-10"
    >
      <p className="eyebrow mb-10 text-muted-foreground">Filosofía</p>
      <p className="display-md flex flex-wrap gap-x-[0.28em] gap-y-1 font-display text-foreground">
        {words.map((word, i) => {
          const start = i / words.length
          const end = start + 1 / words.length
          return <Word key={i} progress={scrollYProgress} range={[start, end]} word={word} />
        })}
      </p>
    </section>
  )
}

function Word({
  word,
  progress,
  range,
}: {
  word: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.18, 1])
  return <motion.span style={{ opacity }}>{word}</motion.span>
}
