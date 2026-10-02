import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"

export default async function CotizacionDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol === "admin") {
    redirect(`/staff/administracion/proyectos/${id}`)
  }
  redirect(`/staff/gestion/proyectos/${id}`)
}