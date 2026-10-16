import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { UsuariosListClient } from "./usuarios-list-client"

export default async function UsuariosPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") return <Forbidden />

  return <UsuariosListClient />
}