"use client"

import { useEffect, useRef, useState } from "react"

/**
 * `true` mientras el elemento está dentro del viewport (más `rootMargin`).
 *
 * Sirve para encender trabajo caro solo cuando se ve: la onda infinita de
 * `.tonfort-fabric`, el `play()` de un video de 13,8 MB. Sin esto, ambos
 * consumen hilo principal y ancho de banda aunque la sección esté fuera de
 * pantalla.
 *
 * Devuelve un ref estable: en navegadores sin IntersectionObserver devuelve
 * `true` desde el primer render, para que el contenido nunca se quede apagado.
 */
export function useInViewport<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) setInView(entrada.isIntersecting)
      },
      { rootMargin },
    )
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}