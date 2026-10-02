import { getVisoresLandingActivos } from "@/lib/portfolio-service"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import { LandingVisor } from "@/components/tonfort/landing-visor"
import { Hero } from "@/components/tonfort/landing/hero"
import { Luz } from "@/components/tonfort/landing/luz"
import { ProyectosRecientes } from "@/components/tonfort/landing/proyectos-recientes"
import { Equipo } from "@/components/tonfort/landing/equipo"
import { AgendaCta } from "@/components/tonfort/landing/agenda-cta"

// Los visores se leen una vez y se reparten por slot. Un slot sin fila activa
// simplemente no se renderiza: no hay placeholder de video inventado.
export const revalidate = 300

export default async function HomePage() {
  const visores = await getVisoresLandingActivos()
  const visorPrimero = visores.find((v) => v.slot === "primero")
  const visorSegundo = visores.find((v) => v.slot === "segundo")

  return (
    <main className="dark bg-black">
      <PublicNavbar />

      <Hero />

      {visorPrimero && (
        <LandingVisor
          videoGlobalUrl={visorPrimero.video_global_url}
          frameCentroMs={visorPrimero.frame_centro_ms}
          animaciones={visorPrimero.animaciones}
          eyebrow={visorPrimero.eyebrow}
          titulo={visorPrimero.titulo}
          descripcion={visorPrimero.descripcion}
        />
      )}

      <Luz />

      <ProyectosRecientes />

      {visorSegundo && (
        <LandingVisor
          videoGlobalUrl={visorSegundo.video_global_url}
          frameCentroMs={visorSegundo.frame_centro_ms}
          animaciones={visorSegundo.animaciones}
          eyebrow={visorSegundo.eyebrow}
          titulo={visorSegundo.titulo}
          descripcion={visorSegundo.descripcion}
        />
      )}

      <Equipo />

      <AgendaCta />

      <PublicFooter />
    </main>
  )
}
