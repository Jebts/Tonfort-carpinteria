"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

const links = [
  { label: "Filosofía", href: "/#filosofia" },
  { label: "Espacios", href: "/#espacios" },
  { label: "Luz", href: "/#luz" },
  { label: "Experiencia", href: "/#experiencia" },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Historia", href: "/historia" },
  { label: "Agenda", href: "/agenda" },
]

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const isHome = pathname === "/"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Cerrar el menú desplegable (móvil) al hacer clic fuera de la cabecera.
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

  // Over the hero (home, not scrolled) the text is always light; elsewhere it adopts theme colors.
  const overHero = isHome && !scrolled && !open

  return (
    <header
      ref={navRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled || open
          ? "border-b border-border bg-background/80 text-foreground backdrop-blur-xl"
          : "border-b border-transparent bg-transparent text-white",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
        <a href={isHome ? "#top" : "/"} className="flex h-16 items-center self-center text-current" aria-label="Tonfort — inicio">
          <Logo />
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn(
                  "font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-100",
                  overHero ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 self-center">
          <ThemeToggle className={overHero ? "border-white/30 text-white" : "border-border text-foreground"} />
          <a
            href="/#contacto"
            className={cn(
              "hidden h-9 items-center rounded-full px-6 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-90 md:inline-flex",
              overHero ? "bg-white text-[#0a1f33]" : "bg-primary text-primary-foreground",
            )}
          >
            Contacto
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <span className={cn("h-px w-6 bg-current transition-transform", open && "translate-y-[7px] rotate-45")} />
            <span className={cn("h-px w-6 bg-current transition-opacity", open && "opacity-0")} />
            <span className={cn("h-px w-6 bg-current transition-transform", open && "-translate-y-[7px] -rotate-45")} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <ul className="flex flex-col px-6 py-4">
            {links.concat({ label: "Contacto", href: "/#contacto" }).map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-mono text-sm uppercase tracking-widest text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
