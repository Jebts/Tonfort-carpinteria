"use client"

import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import {
  CinematicBand,
  Reveal,
  GradientText,
  ButtonLink,
} from "@/components/tonfort/public-animations"
import { HistoriaCarousel } from "@/components/tonfort/historia-carousel"
import { Heart, Ruler, ShieldCheck, Sparkles } from "lucide-react"
import { BLOQUES_HISTORIA } from "@/content/historia"

const EYEBROW = "text-[10px] uppercase tracking-[.34em] text-[#2856c7]"
const HEADING = "mt-5 text-5xl font-medium leading-[.92] tracking-[-.07em] text-[#0B1D3A] md:text-7xl"
const COPY = "text-lg leading-7 text-[#4A5163]"

export default function HistoriaPage() {
  const valores = [
    { icon: Heart, label: "Calidad", copy: "Materiales nobles, acabados que envejecen con dignidad." },
    { icon: Ruler, label: "Precisión", copy: "Milímetros que marcan la diferencia entre bueno y exacto." },
    { icon: ShieldCheck, label: "Garantía", copy: "Respuesta real. Sin letra pequeña, sin excusas." },
    { icon: Sparkles, label: "Diseño", copy: "La luz como material. El espacio como protagonista." },
  ]

  return (
    <main className="bg-[#F7F4EE] text-[#0B1D3A]">
      <PublicNavbar tone="light" />
      <CinematicBand
        src="/history-workshop-light.png"
        eyebrow="Nuestra historia"
        title="La luz vuelve a
        encenderse."
        copy="Un espacio bien iluminado cambia la manera de habitarlo."
        align="left"
        tone="light"
      />
      <section className="relative px-6 py-24 md:px-10 md:py-40">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className={EYEBROW}>Filosofía</p>
          <h2 className={HEADING}>
            No empezamos con una marca.<br />
            Empezamos con una mesa.
          </h2>
        </Reveal>
      </section>
      <section className="relative bg-white px-6 py-24 md:px-10 md:py-40">
        <div className="mx-auto max-w-5xl space-y-24">
          {BLOQUES_HISTORIA.map((bloque) => (
            <Reveal key={bloque.id} className="flex flex-col gap-12 items-start md:flex-row">
              <div className={`w-full md:w-1/2 ${bloque.imagenDerecha ? "md:order-2" : ""}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#E8DFD0]">
                  <img src={bloque.imagen} alt={bloque.etiqueta} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#E8DFD0]/25 via-transparent to-transparent" />
                </div>
              </div>
              <div
                className={`w-full pt-8 md:w-1/2 md:pt-0 ${bloque.imagenDerecha ? "md:order-1 md:text-right" : ""}`}
              >
                <p className={EYEBROW}>{bloque.etiqueta}</p>
                <h3 className="mt-5 text-4xl font-medium leading-[.92] tracking-[-.07em] text-[#0B1D3A] md:text-5xl">
                  {bloque.titulo}
                </h3>
                <div className={`mt-8 space-y-4 ${COPY}`}>
                  {bloque.parrafos.map((parrafo, i) => (
                    <p key={i}>{parrafo}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="relative border-y border-[#E8DFD0] bg-[#F7F4EE] px-6 py-24 md:px-10 md:py-40">
        <Reveal className="mx-auto mb-20 max-w-4xl text-center">
          <p className={EYEBROW}>Lo que nos guía</p>
          <h2 className={HEADING}>
            Valores que<br />
            <GradientText tone="light">se sienten.</GradientText>
          </h2>
        </Reveal>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            {valores.map((valor) => (
              <Reveal key={valor.label} className="group h-full">
                <div className="h-full rounded-2xl border border-[#E8DFD0] bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#2856c7]/40 hover:shadow-[0_24px_50px_-30px_rgba(11,29,58,.45)]">
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#2856c7]/10 text-[#2856c7] transition-colors duration-500 group-hover:bg-[#2856c7] group-hover:text-white">
                    <valor.icon size={28} />
                  </div>
                  <h3 className="text-xl font-medium text-[#0B1D3A]">{valor.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#4A5163]">{valor.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="relative bg-white px-6 py-24 md:px-10 md:py-40">
        <Reveal className="mx-auto mb-16 max-w-4xl text-center">
          <p className={EYEBROW}>Proyectos de la época</p>
          <h2 className={HEADING}>
            Lo que hicimos<br />
            <GradientText tone="light">en Bogotá.</GradientText>
          </h2>
        </Reveal>
        <HistoriaCarousel />
      </section>
      <section className="relative border-t border-[#E8DFD0] bg-[#F7F4EE] px-6 py-24 md:px-10 md:py-40">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-medium leading-[.92] tracking-[-.07em] text-[#0B1D3A] md:text-7xl">
            Tu espacio<br />
            <GradientText tone="light">espera.</GradientText>
          </h2>
          <p className={`mt-8 ${COPY}`}>
            Agenda una visita y empecemos a diseñar la atmósfera que mereces.
          </p>
          <div className="mt-10">
            <ButtonLink href="/agenda" tone="light">Agendar una cita</ButtonLink>
          </div>
        </Reveal>
      </section>
      <PublicFooter tone="light" />
    </main>
  )
}
