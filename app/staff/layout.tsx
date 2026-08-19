"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { StaffSidebar } from "@/components/tonfort/staff-sidebar"
import { StaffMobileHeader } from "@/components/tonfort/staff-mobile-header"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

export default function StaffLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const esLogin = pathname === "/staff/login"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!esLogin && (
        <>
          <StaffMobileHeader />
          <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 border-r border-border bg-background/95 backdrop-blur-xl md:block">
            <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
              <StaffSidebar className="flex-1" />
            </div>
          </aside>
        </>
      )}
      <div className={cn("min-h-screen px-4 py-6 md:px-8 md:py-8", !esLogin && "md:pl-64")}>
        {children}
      </div>
      <Toaster />
    </div>
  )
}
