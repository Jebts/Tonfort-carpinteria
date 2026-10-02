"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { Menu, X, ArrowUpRight } from "lucide-react"
import { Logo } from "@/components/tonfort/logo"
import type { Tone } from "@/components/tonfort/public-animations"

interface NavItem {
  label: string
  href: string
}

// Sin dropdown, según lo acordado: el switch de sede vive dentro del
// portafolio y la CTA cubre la entrada a la agenda.
const LINKS: NavItem[] = [
  { label: "Sede", href: "/sede" },
  { label: "Portafolio", href: "/portafolio/santa-marta" },
  { label: "Historia", href: "/historia" },
]

const CTA: NavItem = { label: "Agendar cita", href: "/agenda/modalidad" }

export function PublicNavbar({ tone = "dark" }: { tone?: Tone }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const light = tone === "light"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // El menú móvil se cierra solo al navegar.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const close = () => setOpen(false)

  // `/portafolio/bogota` también marca activo el link de Portafolio.
  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)

  const textoLink = (activo: boolean) =>
    light
      ? `text-sm transition ${activo ? "text-[#0B1D3A]" : "text-[#4A5163] hover:text-[#0B1D3A]"}`
      : `text-sm transition ${activo ? "text-white" : "text-[#a1a1a6] hover:text-white"}`

  // La CTA es viva (no translúcida) y con glow: es el punto de entrada.
  const claseCta = light
    ? "bg-[#2856c7] text-white shadow-[0_0_24px_rgba(40,86,199,.28)] hover:bg-[#1c46a8]"
    : "bg-[#3769e6] text-black shadow-[0_0_28px_rgba(55,105,230,.35)] hover:bg-[#2856c7] hover:text-white"

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        light
          ? "bg-[#F7F4EE]/85 backdrop-blur-2xl"
          : scrolled
            ? "bg-black/65 backdrop-blur-2xl"
            : "bg-black/15"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className={`flex items-center transition-opacity hover:opacity-85 ${light ? "text-[#0B1D3A]" : "text-white"}`}
          onClick={close}
          aria-label="Tonfort, inicio"
        >
          <Logo showWordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {LINKS.map((link) => {
            const activo = esActivo(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={activo ? "page" : undefined}
                className={textoLink(activo)}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href={CTA.href}
            aria-current={esActivo(CTA.href) ? "page" : undefined}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-95 ${claseCta}`}
          >
            {CTA.label}
          </Link>
        </nav>

        <button
          className={`relative z-20 rounded-full p-2 md:hidden ${light ? "text-[#0B1D3A]" : "text-white"}`}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed inset-0 -z-10 flex min-h-screen flex-col px-6 pb-12 pt-28 md:hidden ${
            light ? "bg-[#F7F4EE] text-[#0B1D3A]" : "bg-black text-white"
          }`}
        >
          <nav className="flex flex-col gap-6 text-4xl font-medium" aria-label="Menú móvil">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={esActivo(link.href) ? "page" : undefined}
                className={
                  light
                    ? "text-[#4A5163] transition hover:text-[#0B1D3A]"
                    : "text-[#a1a1a6] transition hover:text-white"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href={CTA.href}
            onClick={close}
            className={`mt-auto flex w-full items-center justify-between rounded-full px-6 py-4 text-lg font-medium transition-all duration-200 ease-out active:scale-95 ${claseCta}`}
          >
            {CTA.label}
            <ArrowUpRight size={20} />
          </Link>
        </motion.div>
      )}
    </header>
  )
}
