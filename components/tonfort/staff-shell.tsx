"use client"

import { useState } from "react"
import { StaffSidebar } from "./staff-sidebar"
import { cn } from "@/lib/utils"
import type { RolStaff } from "@/lib/auth-core"

interface StaffShellProps {
  rol: RolStaff
  children: React.ReactNode
}

export function StaffShell({ rol, children }: StaffShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full border-r border-border bg-background/95 backdrop-blur-xl md:block transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
          <StaffSidebar
            collapsed={collapsed}
            onCollapseToggle={() => setCollapsed((c) => !c)}
            rol={rol}
          />
        </div>
      </aside>
      <main
        className={cn(
          "flex-1 min-h-screen px-4 py-6 md:px-8 md:py-8 transition-all duration-300 ease-in-out",
          collapsed ? "md:pl-16" : "md:pl-64",
        )}
      >
        {children}
      </main>
    </div>
  )
}
