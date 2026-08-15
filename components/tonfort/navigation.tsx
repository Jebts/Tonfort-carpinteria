"use client"

import { useEffect, useState } from "react"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

const links = [
  { label: "Filosofía", href: "#filosofia" },
  { label: "Espacios", href: "#espacios" },
  { label: "Luz", href: "#luz" },
  { label: "Proyectos", href: "#proyectos" },
]

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Over the hero (not scrolled) the text is always light; once scrolled it adopts theme colors.
  const overHero = !scrolled && !open

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled || open
          ? "border-b border-border bg-background/80 text-foreground backdrop-blur-xl"
          : "border-b border-transparent bg-transparent text-white",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#top" className="text-current" aria-label="Tonfort — inicio">
          <Logo />
        </a>

        <ul className="hidden items-center gap-10 md:flex">
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

        <div className="flex items-center gap-3">
          <ThemeToggle className={overHero ? "border-white/30 text-white" : "border-border text-foreground"} />
          <a
            href="#contacto"
            className={cn(
              "hidden rounded-full px-6 py-2.5 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-90 md:inline-block",
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
            {links.concat({ label: "Contacto", href: "#contacto" }).map((link) => (
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
