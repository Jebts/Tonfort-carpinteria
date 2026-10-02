import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"

export default async function ClientesRedirect() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  redirect("/staff/gestion/clientes")
}