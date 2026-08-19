"use client"

import { Reveal } from "./reveal"

const steps = [
  {
    step: "01",
    title: "Escucha y visita",
    body: "Entendemos cómo vives el espacio, sus límites arquitectónicos y lo que esperas de él.",
  },
  {
    step: "02",
    title: "Diseño y planeación",
    body: "Proyectamos mobiliario, distribución y luz como un solo sistema, no como partes sueltas.",
  },
  {
    step: "03",
    title: "Fabricación a medida",
    body: "Producimos en madera con precisión milimétrica y acabados cuidados hasta el último canto.",
  },
  {
    step: "04",
    title: "Instalación y luz",
    body: "Montamos el espacio completo y calibramos cada capa de luz hasta encontrar su punto justo.",
  },
]

export function Process() {
  return (
    <section className="border-y border-border bg-muted/40 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <p className="eyebrow mb-6 text-muted-foreground">Proceso</p>
          <h2 className="display-lg max-w-2xl text-balance font-display text-foreground">
            De la idea al espacio habitado.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.1} className="border-t border-foreground/15 pt-6">
              <span className="font-mono text-sm text-accent">{step.step}</span>
              <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
