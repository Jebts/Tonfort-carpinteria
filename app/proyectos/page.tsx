import type { Metadata } from "next"
import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { ProjectStory } from "@/components/tonfort/project-story"
import { Reveal } from "@/components/tonfort/reveal"
import { getPublicProjects } from "@/app/actions/projects"

export const metadata: Metadata = {
  title: "Proyectos — Tonfort",
  description:
    "Historial de proyectos de Tonfort: cocinas, closets, muebles y puertas a medida. Cada espacio contado desde su idea, su ejecución y su luz.",
}

export default async function ProyectosPage() {
  const projects = await getPublicProjects()

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navigation solid />

      {/* Header */}
      <header className="relative overflow-hidden bg-[#050a12] pt-40 pb-28 lg:pt-48 lg:pb-36">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[50vw] w-[50vw] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-blue/30 blur-[140px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal>
            <p className="eyebrow mb-6 text-white/60">Historial de proyectos</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl max-w-4xl text-balance font-display text-white">
              Cada espacio tiene una historia detrás.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-white/75">
              No mostramos catálogos: contamos cómo pensamos, planeamos y ejecutamos cada proyecto,
              desde la primera idea hasta la luz que lo termina de definir.
            </p>
          </Reveal>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="mx-auto max-w-7xl px-6 py-32 text-center lg:px-10">
          <p className="text-muted-foreground">Pronto compartiremos nuestros proyectos aquí.</p>
        </div>
      ) : (
        <div>
          {projects.map((project, i) => (
            <ProjectStory key={project.id} project={project} index={i} />
          ))}
        </div>
      )}

      <Footer />
    </main>
  )
}
