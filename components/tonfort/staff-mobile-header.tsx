"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { Menu, X } from "lucide-react"
import { StaffSidebar } from "./staff-sidebar"
import { Logo } from "./logo"

export function StaffMobileHeader() {
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  // Cerrar el menú desplegable al hacer clic fuera de la cabecera.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl md:hidden"
    >
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/staff" aria-label="Tonfort Staff — inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="press relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute h-0.5 w-5 rounded bg-current"
            />
            <motion.span
              animate={{ opacity: open ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className="absolute h-0.5 w-5 rounded bg-current"
            />
            <motion.span
              animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute h-0.5 w-5 rounded bg-current"
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="staff-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background"
          >
            <motion.div
              className="px-4 py-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
              }}
            >
              <StaffSidebar className="w-full" onItemClick={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
