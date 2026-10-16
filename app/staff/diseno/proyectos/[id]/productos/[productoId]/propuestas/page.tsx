import { getSesionServer } from "@/lib/staff-auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { getServerOrigin } from "@/lib/server-origin"
import { DisenoPropuestasClient } from "./diseno-propuestas-client"

export default async function DisenoPropuestasPage(
  { params }: { params: Promise<{ id: string; productoId: string }> }
) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  const resolvedParams = await params
  const proyectoId = resolvedParams.id
  const productoId = resolvedParams.productoId

  // Fetch project and product data for breadcrumbs
  const cookieHeader = (await headers()).get("cookie") ?? ""
  const origin = await getServerOrigin()
  const [proyectoRes, productoRes] = await Promise.all([
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}`, {
      headers: { cookie: cookieHeader },
    }),
    fetch(`${origin}/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, {
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

  return (
    <DisenoPropuestasClient
      proyectoId={proyectoId}
      productoId={productoId}
      clienteNombre={clienteNombre}
      productoNombre={productoNombre}
    />
  )
}