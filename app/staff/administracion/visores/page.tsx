import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { VisoresLandingListaClient } from "@/components/tonfort/staff/visores-landing-lista-client"

export const metadata = {
  title: "Visores landing",
}

export default async function VisoresLandingPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") return <Forbidden />

  return <VisoresLandingListaClient />
}
