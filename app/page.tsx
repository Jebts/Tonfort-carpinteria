import { getVisoresLandingActivos } from "@/lib/portfolio-service"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import { VisoresCarousel } from "@/components/tonfort/landing/visor-carousel"
import { Hero } from "@/components/tonfort/landing/hero"
import { Luz } from "@/components/tonfort/landing/luz"
import { Nosotros } from "@/components/tonfort/landing/nosotros"
import { ProyectosRecientes } from "@/components/tonfort/landing/proyectos-recientes"
import { Equipo } from "@/components/tonfort/landing/equipo"
import { AgendaCta } from "@/components/tonfort/landing/agenda-cta"

// Los visores se leen una vez y se recorren en un único carrusel. Sin visores
// activos (o sin video global) la sección no se renderiza: no hay placeholder
// de video inventado.
export const revalidate = 300

export default async function HomePage() {
  const visores = await getVisoresLandingActivos()
  const visoresVisibles = visores.filter((visor) => Boolean(visor.video_global_url))

  return (
    <main className="dark bg-black">
      <PublicNavbar />

      <Hero />

      <Nosotros />

      <Luz />

      <VisoresCarousel visores={visoresVisibles} />

      <ProyectosRecientes />

      <Equipo />

      <AgendaCta />

      <PublicFooter />
    </main>
  )
}