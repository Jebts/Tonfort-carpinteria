import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"

export default async function AgendaRedirect() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  redirect("/staff/gestion/agenda")
}