import { getSesionServer } from "@/lib/staff-auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { StaffSidebar } from "@/components/tonfort/staff-sidebar"
import { cn } from "@/lib/utils"
import { getServerOrigin } from "@/lib/server-origin"
import { DisenoPropuestaDetalleClient } from "./diseno-propuesta-detalle-client"

export default async function DisenoPropuestaDetallePage(
  { params }: { params: Promise<{ id: string; productoId: string; propuestaId: string }> },
) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  const resolvedParams = await params
  const proyectoId = resolvedParams.id
  const productoId = resolvedParams.productoId
  const propuestaId = resolvedParams.propuestaId

  const cookieHeader = (await headers()).get("cookie") ?? ""
  const origin = await getServerOrigin()
  const [proyectoRes, productoRes, propuestaRes, animacionesRes] = await Promise.all([
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}`, {
      headers: { cookie: cookieHeader },
    }),
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, {
      headers: { cookie: cookieHeader },
    }),
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}`, {
      headers: { cookie: cookieHeader },
    }),
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}/animaciones`, {
      headers: { cookie: cookieHeader },
    }),
  ])

  let clienteNombre = "Proyecto"
  let productoNombre = "Producto"

  if (proyectoRes.ok) {
    const data = await proyectoRes.json()
    clienteNombre = data.proyecto?.cliente_nombre ?? "Proyecto"
  }

  if (productoRes.ok) {
    const data = await productoRes.json()
    productoNombre = data.producto?.titulo ?? data.producto?.nombre ?? "Producto"
  }

  let propuestaData: {
    id: string
    producto_id: string
    titulo: string
    descripcion: string | null
    video_global_url: string | null
    frame_centro_ms: number | null
    estado: "borrador" | "lista" | "enviada"
    link_token: string | null
    link_activo: boolean
    publicada_portafolio: boolean
    orden: number
    created_at: string
    updated_at: string
  } | null = null

  if (propuestaRes.ok) {
    const data = await propuestaRes.json()
    propuestaData = data.propuesta
  }

  if (!propuestaData) {
    redirect(`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`)
  }

  let initialAnimaciones = []
  if (animacionesRes.ok) {
    const animData = await animacionesRes.json()
    initialAnimaciones = animData.animaciones ?? []
  }

  return (
    <DisenoPropuestaDetalleClient
      proyectoId={proyectoId}
      productoId={productoId}
      propuestaId={propuestaId}
      clienteNombre={clienteNombre}
      productoNombre={productoNombre}
      propuesta={propuestaData}
      initialAnimaciones={initialAnimaciones}
      rol={sesion.rol}
    />
  )
}