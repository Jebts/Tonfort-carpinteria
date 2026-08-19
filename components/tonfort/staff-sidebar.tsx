"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import {
  CalendarDays,
  CalendarCheck,
  FolderKanban,
  LogOut,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

const items = [
  { href: "/staff/clientes", label: "Clientes", icon: Users },
  { href: "/staff/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/staff/citas", label: "Citas", icon: CalendarCheck },
  { href: "/staff/portafolio", label: "Portafolio", icon: FolderKanban },
]

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0 },
}

export function StaffSidebar({
  className,
  onItemClick,
}: {
  className?: string
  onItemClick?: () => void
}) {
  const pathname = usePathname()

  const logout = async () => {
    await fetch("/api/staff/logout", { method: "POST" })
    location.href = "/staff/login"
  }

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Navegación staff">
      <motion.div variants={itemVariants}>
        <Link
          href="/staff"
          className="px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          tonfort
        </Link>
      </motion.div>
      <div className="flex-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Link
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "press flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </motion.div>
          )
        })}
      </div>
      <motion.div variants={itemVariants}>
        <button
          type="button"
          onClick={logout}
          className="press flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </motion.div>
      <motion.div variants={itemVariants} className="flex justify-center">
        <ThemeToggle />
      </motion.div>
    </nav>
  )
}
