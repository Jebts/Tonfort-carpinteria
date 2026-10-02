import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import { getPropuestaByToken } from "@/lib/portfolio-service"

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  return {
    title: `Propuesta ${token.slice(0, 8)} — Tonfort`,
    description: "Propuesta de diseño de video.",
  }
}

export default async function PropuestaPage({ params }: PageProps) {
  const { token } = await params
  const data = await getPropuestaByToken(token)

  if (!data) {
    notFound()
  }

  const { proyecto, producto, propuesta, animaciones } = data

  const handleElegir = () => {
    // El flujo público ya no pide diseñador ni propuesta: el `propuesta` dejó de
    // tener efecto y la cita se agenda desde el paso 1 del flujo nuevo.
    window.location.href = "/agenda/modalidad"
  }

  return (
    <main className="min-h-screen bg-black text-foreground">
      <VideoViewer
        video_global_url={propuesta.video_global_url}
        frame_centro_ms={propuesta.frame_centro_ms}
        animaciones={animaciones}
        titulo_proyecto={proyecto.titulo}
        nombreproducto={producto.titulo}
        descripcion={propuesta.descripcion}
        isCotizacion={true}
        onElegir={handleElegir}
      />
    </main>
  )
}