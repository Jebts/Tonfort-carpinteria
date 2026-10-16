import { getSesionServer } from "@/lib/staff-auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { getServerOrigin } from "@/lib/server-origin"
import { DisenoProductoDetalleClient } from "./diseno-producto-detalle-client"

export default async function DisenoProductoDetallePage(
  { params }: { params: Promise<{ id: string; productoId: string }> }
) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  const resolvedParams = await params
  const proyectoId = resolvedParams.id
  const productoId = resolvedParams.productoId

  // Fetch product data for breadcrumbs
  const cookieHeader = (await headers()).get("cookie") ?? ""
  const origin = await getServerOrigin()
  const productoRes = await fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, {
    headers: { cookie: cookieHeader },
  })

  let productoNombre = "Producto"

  if (productoRes.ok) {
    const data = await productoRes.json()
    productoNombre = data.producto?.titulo ?? data.producto?.nombre ?? "Producto"
  }

  return (
    <DisenoProductoDetalleClient
      proyectoId={proyectoId}
      productoId={productoId}
      productoNombre={productoNombre}
    />
  )
}