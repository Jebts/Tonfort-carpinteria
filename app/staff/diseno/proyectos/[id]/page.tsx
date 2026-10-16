import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { DisenoProyectoDetalleClient } from "./diseno-proyecto-detalle-client"

export default async function DisenoProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  const resolvedParams = await params
  const proyectoId = resolvedParams.id

  return <DisenoProyectoDetalleClient proyectoId={proyectoId} />
}