import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"

export default async function StaffIndexPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")

  switch (sesion.rol) {
    case "admin":
      redirect("/staff/administracion")
      break
    case "asesor":
      redirect("/staff/gestion")
      break
    case "disenador":
      redirect("/staff/diseno")
      break
    default:
      redirect("/staff/administracion")
  }
}