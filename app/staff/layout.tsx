import { getSesionServer } from "@/lib/staff-auth"
import { StaffMobileHeader } from "@/components/tonfort/staff-mobile-header"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesionServer()

  if (!sesion) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StaffMobileHeader />
      <main className={cn("min-h-screen px-4 py-6 md:px-8 md:py-8")}>
        {children}
      </main>
      <Toaster />
    </div>
  )
}