import { cookies } from "next/headers"
import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { getServerOrigin } from "@/lib/server-origin"
import PortafolioAdminClient from "./portafolio-admin-client"
import type { ProyectoConMedia } from "@/lib/supabase/types"

// El sidebar y el armazón los pone `app/staff/administracion/layout.tsx`.
export default async function AdministracionPortafolioPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")

  // Los proyectos se cargan en el servidor (self-fetch a la propia API con la
  // cookie de sesión), igual que el resto de páginas de staff. Así el primer
  // render no depende de un fetch desde el navegador, que falla cuando el
  // documento se abre desde un origen distinto (preview embebido, proxy).
  const origin = await getServerOrigin()
  const cookieHeader = (await cookies()).toString()

  let proyectosIniciales: ProyectoConMedia[] = []
  try {
    const res = await fetch(`${origin}/api/staff/administracion/portafolio/proyectos?conMedia=true`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      proyectosIniciales = data.proyectos ?? []
    } else {
      console.error("[portafolio] carga inicial:", res.status)
    }
  } catch (err) {
    console.error("[portafolio] carga inicial:", err instanceof Error ? err.message : err)
  }

  return <PortafolioAdminClient proyectosIniciales={proyectosIniciales} />
}
