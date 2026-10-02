"use client"

import { useEffect, type ReactNode } from "react"
import Lenis from "lenis"

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  // Marca el documento como "motion en vivo". Hasta que este efecto corre, el
  // SSR pinta los wrappers animados en su estado inicial (opacity:0), y la
  // regla de globals.css los fuerza a visibles. Así, si el bundle no hidrata
  // (chunk 404 por caché, script bloqueado, JS deshabilitado), la página se
  // lee igual en vez de quedar en blanco.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add("tonfort-motion")
    return () => root.classList.remove("tonfort-motion")
  }, [])

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    })

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
