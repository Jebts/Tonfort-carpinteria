import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { Reveal } from "@/components/tonfort/reveal"

export const metadata: Metadata = {
  title: "Historia — Tonfort",
  description:
    "La historia de Tonfort: un taller familiar en Santa Marta que convirtió el oficio de la madera en el diseño de espacios para habitar.",
}

const milestones = [
  {
    year: "El origen",
    title: "Una mesa de taller y un apellido",
    body: "Tonfort nació de las manos de una familia para la que la madera nunca fue solo un material, sino un lenguaje. Lo que empezó como encargos entre vecinos se fue convirtiendo en una forma propia de entender el mobiliario: pensar primero el espacio, después el mueble.",
  },
  {
    year: "El oficio",
    title: "Aprender midiendo, fallando, puliendo",
    body: "Cada proyecto nos enseñó algo. Que un cajón bien planeado cambia una rutina. Que una luz escondida transforma una habitación. Que la precisión no se ve, pero se siente todos los días. Ese aprendizaje se quedó en la casa y pasó de una generación a la siguiente.",
  },
  {
    year: "Hoy",
    title: "Diseño de espacios, hechos a medida",
    body: "Seguimos siendo un taller familiar, pero con una convicción clara: no vendemos muebles, diseñamos la experiencia de habitar un espacio. Cocinas, closets, muebles de TV y puertas pensados para una vida concreta —la tuya— con la iluminación integrada como parte del proyecto.",
  },
]

export default function HistoriaPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/historia-taller.png"
            alt="Taller familiar de Tonfort iluminado por luz cálida"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a12]/85 via-[#050a12]/55 to-[#050a12]/90" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[85svh] max-w-5xl flex-col justify-end px-6 pb-20 pt-40 lg:px-10">
          <Reveal>
            <p className="eyebrow mb-6 text-white/60">Nuestra historia</p>
            <h1 className="display-xl max-w-3xl text-balance font-display text-white">
              Un oficio de familia, hecho espacio.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-white/80">
              Detrás de cada proyecto de Tonfort hay generaciones que aprendieron a escuchar la
              madera. Esta es la historia de cómo ese oficio se convirtió en una manera de diseñar.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Intro statement */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-10 lg:py-32">
        <Reveal>
          <p className="display-md text-balance font-display leading-tight text-foreground">
            &ldquo;La madera no se impone, se acompaña. Nuestro trabajo es escuchar el espacio y
            responderle con precisión y calidez.&rdquo;
          </p>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-brand-blue">
            Familia Tonfort — Santa Marta
          </p>
        </Reveal>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-6xl px-6 pb-8 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-3 lg:gap-10">
          {milestones.map((m, i) => (
            <Reveal key={m.year} delay={i * 0.1}>
              <div className="flex flex-col border-t border-border pt-8">
                <span className="font-mono text-xs uppercase tracking-widest text-brand-blue">
                  {m.year}
                </span>
                <h2 className="mt-5 text-2xl font-medium leading-tight text-foreground">{m.title}</h2>
                <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Craft image + values */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg">
              <img
                src="/images/historia-manos.png"
                alt="Manos puliendo el canto de una puerta de madera en el taller"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="eyebrow mb-6 text-brand-blue">Lo que no cambia</p>
            <h2 className="display-md text-balance font-display text-foreground">
              Precisión heredada, calidez intencional.
            </h2>
            <ul className="mt-10 flex flex-col gap-8">
              {[
                {
                  t: "Planeación al milímetro",
                  d: "Cada proyecto se dibuja antes de cortarse. Medimos, proyectamos y anticipamos el uso real del espacio.",
                },
                {
                  t: "Madera con criterio",
                  d: "Elegimos vetas, tonos y acabados por cómo dialogan con la luz y con la arquitectura, no por catálogo.",
                },
                {
                  t: "La luz como material",
                  d: "Integramos la iluminación desde el diseño para que el mobiliario tenga vida a cualquier hora del día.",
                },
              ].map((v) => (
                <li key={v.t} className="border-l-2 border-brand-blue/40 pl-6">
                  <h3 className="text-lg font-medium text-foreground">{v.t}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{v.d}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center lg:px-10">
          <Reveal>
            <h2 className="display-md text-balance font-display text-foreground">
              Escribamos el siguiente capítulo en tu espacio.
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/agenda"
                className="rounded-full bg-primary px-8 py-3.5 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
              >
                Agendar una cita
              </Link>
              <Link
                href="/proyectos"
                className="rounded-full border border-border px-8 py-3.5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
              >
                Ver proyectos
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  )
}
