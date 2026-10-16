import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { DisenoProyectosClient } from "./diseno-proyectos-client"

export default async function DisenoProyectosPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  return <DisenoProyectosClient rol={sesion.rol} />
}