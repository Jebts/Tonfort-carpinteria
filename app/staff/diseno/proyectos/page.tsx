import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { StaffSidebar } from "@/components/tonfort/staff-sidebar"
import { cn } from "@/lib/utils"
import { DisenoProyectosClient } from "./diseno-proyectos-client"

export default async function DisenoProyectosPage() {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "disenador"].includes(sesion.rol)) return <Forbidden />

  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 border-r border-border bg-background/95 backdrop-blur-xl md:block">
        <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
          <StaffSidebar className="flex-1" rol={sesion.rol} />
        </div>
      </aside>
      <main className={cn("flex-1 min-h-screen px-4 py-6 md:px-8 md:py-8", "md:pl-64")}>
        <DisenoProyectosClient rol={sesion.rol} />
      </main>
    </div>
  )
}