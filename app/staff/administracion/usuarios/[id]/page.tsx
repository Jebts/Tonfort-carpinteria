import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { UsuarioEditClient } from "./usuario-edit-client"

export default async function UsuarioEditPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") return <Forbidden />

  return <UsuarioEditClient usuarioId={(await params).id} />
}