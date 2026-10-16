"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { useInViewport } from "@/hooks/use-in-viewport"

// El embed de Google Maps es el iframe más caro de la web pública: descarga el
// runtime de Maps y las teselas antes de pintar la primera calle. Con
// `loading="lazy"` arrancaba cuando el marco entraba en pantalla y la caja se
// quedaba vacía uno o dos segundos: se leía como carga lenta.
//
// Aquí se monta 150% de viewport antes (cuando la sección asoma, sin competir
// con el hero ni con el vídeo) y se abren antes las conexiones a los dominios de
// Google, de modo que al llegar el mapa ya está dibujado. Mientras carga se ve
// una marquesina con el pin en lugar de una caja gris vacía.
export function SedeMapa({ embedUrl, direccion }: { embedUrl: string; direccion: string }) {
  const { ref, inView } = useInViewport<HTMLDivElement>("150%")
  const [montado, setMontado] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (inView) setMontado(true)
  }, [inView])

  // Red de seguridad: si el embed se atasca (red lenta, bloqueador), el pin no
  // debe quedarse tapando el mapa. A los 6 s se retira y se ve lo que Google
  // haya conseguido pintar.
  useEffect(() => {
    if (!montado || listo) return
    const t = setTimeout(() => setListo(true), 6000)
    return () => clearTimeout(t)
  }, [montado, listo])

  return (
    <>
      <link rel="preconnect" href="https://www.google.com" />
      <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />

      <div
        ref={ref}
        className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-black"
      >
        {!listo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <MapPin className="size-6 animate-pulse text-warm-light" aria-hidden />
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Cargando el mapa…</p>
          </div>
        )}
        {montado && (
          <iframe
            src={embedUrl}
            onLoad={() => setListo(true)}
            // El montaje ya está diferido por `useInViewport`: con `lazy` el
            // navegador volvería a retrasar la descarga hasta el umbral por
            // defecto y el anticipo se perdería.
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            allow="fullscreen; geolocation; web-share"
            title={`Ubicación de la sede de Tonfort: ${direccion}`}
            className="size-full"
          />
        )}
      </div>
    </>
  )
}
