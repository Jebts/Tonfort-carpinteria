import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { Forbidden } from "@/components/tonfort/forbidden"
import { StaffShell } from "@/components/tonfort/staff-shell"

export default async function GestionLayout({
  children,
}: { children: React.ReactNode }) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (!["admin", "asesor"].includes(sesion.rol)) return <Forbidden />

  return (
    <div className="flex min-h-screen">
      <StaffShell rol={sesion.rol}>{children}</StaffShell>
    </div>
  )
}