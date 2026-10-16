"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import {
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  FolderKanban,
  LogOut,
  LayoutDashboard,
  Users,
  UserCog,
  ReceiptText,
  Box,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import type { RolStaff } from "@/lib/auth-core"
import { useState } from "react"
import type { ReactNode } from "react"

type Icon = (props: { className?: string }) => ReactNode

interface SidebarItem {
  href: string
  label: string
  icon: Icon
}

interface SidebarSection {
  label: string
  roles: RolStaff[]
  items: SidebarItem[]
}

const sections: SidebarSection[] = [
  {
    label: "Administración",
    roles: ["admin"],
    items: [
      { href: "/staff/administracion", label: "Dashboard", icon: LayoutDashboard },
      { href: "/staff/administracion/cotizaciones", label: "Cotizaciones", icon: ReceiptText },
      { href: "/staff/administracion/usuarios", label: "Usuarios", icon: UserCog },
      { href: "/staff/administracion/portafolio", label: "Portafolio", icon: FolderKanban },
      { href: "/staff/administracion/visores", label: "Visores landing", icon: Box },
    ],
  },
  {
    label: "Gestión",
    roles: ["admin", "asesor"],
    items: [
      { href: "/staff/gestion", label: "Dashboard", icon: LayoutDashboard },
      { href: "/staff/gestion/clientes", label: "Clientes", icon: Users },
      { href: "/staff/gestion/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/staff/gestion/citas", label: "Citas", icon: CalendarCheck },
    ],
  },
  {
    label: "Diseño",
    roles: ["admin", "disenador"],
    items: [
      { href: "/staff/diseno/proyectos", label: "Proyectos", icon: FolderKanban },
    ],
  },
]

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0 },
}

export function StaffSidebar({
  className,
  onItemClick,
  rol,
  collapsedMobile = false,
  collapsed = false,
  onCollapseToggle,
}: {
  className?: string
  onItemClick?: () => void
  rol?: RolStaff
  collapsedMobile?: boolean
  collapsed?: boolean
  onCollapseToggle?: () => void
}) {
  const pathname = usePathname()
  const visibleSections = rol
    ? sections.filter((s) => s.roles.includes(rol))
    : sections

  const [openSection, setOpenSection] = useState<string | null>(null)

  const logout = async () => {
    await fetch("/api/staff/logout", { method: "POST" })
    location.href = "/staff/login"
  }

  const handleBrandClick = () => {
    if (onCollapseToggle) onCollapseToggle()
  }

  const handleBrandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onCollapseToggle) onCollapseToggle()
  }

  const itemClase = (active: boolean) =>
    cn(
      "press flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-muted",
    )

  return (
    <nav
      className={cn(
        "flex flex-col gap-1 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-56",
        className,
      )}
      aria-label="Navegación staff"
    >
      <motion.div variants={itemVariants}>
        <div
          onClick={handleBrandClick}
          onKeyDown={handleBrandKeyDown}
          role="button"
          tabIndex={0}
          className="cursor-pointer px-3 py-2 font-sans text-xs font-medium uppercase tracking-widest text-muted-foreground"
        >
          tonfort
        </div>
      </motion.div>
      <div className="flex-1">
        {visibleSections.map((section) => {
          const isActiveSection = section.items.some((item) =>
            pathname === item.href || pathname.startsWith(item.href + "/"),
          )
          const isFirst = visibleSections.indexOf(section) === 0
          return (
            <motion.div key={section.label} variants={itemVariants}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => {
                    if (openSection === section.label) setOpenSection(null)
                    else setOpenSection(section.label)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:bg-muted",
                    isActiveSection && "bg-muted font-semibold text-foreground",
                  )}
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSection === section.label ? "rotate-180" : "",
                    )}
                  />
                </button>
              )}
              {(openSection === section.label || (isFirst && openSection === null)) &&
                section.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  return (
                    <motion.div key={item.href} variants={itemVariants} className="ml-4">
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        className={cn(
                          "press flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          collapsed ? "justify-center px-1" : "",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {!collapsed && item.label}
                      </Link>
                    </motion.div>
                  )
                })}
            </motion.div>
          )
        })}
      </div>
      {!collapsed && (
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
      )}
      {!collapsed && (
        <motion.div variants={itemVariants} className="flex justify-center">
          <ThemeToggle />
        </motion.div>
      )}
    </nav>
  )
}
