import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { CotizacionesList } from "./cotizaciones-list"

export default async function CotizacionesPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") redirect("/staff")

  return <CotizacionesList />
}
