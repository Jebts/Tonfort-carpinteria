import type { Metadata } from "next"
import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { ProyectosView } from "@/components/tonfort/proyectos-view"
import { getPublishedProjects } from "@/app/actions/projects"

export const metadata: Metadata = {
  title: "Proyectos — Tonfort",
  description:
    "Portafolio de Tonfort: cocinas, closets, muebles de TV y puertas a medida donde la madera y la luz se convierten en atmósfera.",
}

export default async function ProyectosPage() {
  const projects = await getPublishedProjects()

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <ProyectosView projects={projects} />
      <Footer />
    </main>
  )
}
