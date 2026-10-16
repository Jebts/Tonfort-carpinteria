import { getSesionServer } from "@/lib/staff-auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { getServerOrigin } from "@/lib/server-origin"
import { VisoresLandingDetalleClient } from "@/components/tonfort/staff/visores-landing-detalle-client"
import type { VisorLandingAnimacion } from "@/lib/supabase/types"

export default async function VisoresLandingDetallePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") return <Forbidden />

  const { id } = await params

  const cookieHeader = (await headers()).get("cookie") ?? ""
  const origin = await getServerOrigin()

  const [visorRes, animacionesRes] = await Promise.all([
    fetch(`${origin}/api/staff/administracion/visores-landing/${id}`, {
      headers: { cookie: cookieHeader },
    }),
    fetch(`${origin}/api/staff/administracion/visores-landing/${id}/animaciones`, {
      headers: { cookie: cookieHeader },
    }),
  ])

  if (!visorRes.ok) redirect("/staff/administracion/visores")

  const visorData = await visorRes.json()
  const visor = visorData.visor

  let initialAnimaciones: VisorLandingAnimacion[] = []
  if (animacionesRes.ok) {
    const animData = await animacionesRes.json()
    initialAnimaciones = animData.animaciones ?? []
  }

  return (
    <VisoresLandingDetalleClient
      visor={{ ...visor, animaciones: initialAnimaciones }}
    />
  )
}
