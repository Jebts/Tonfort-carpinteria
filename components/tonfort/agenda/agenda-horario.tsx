"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Calendario, type BloqueSemana } from "@/components/tonfort/agenda/calendario"
import { FormularioCita } from "@/components/tonfort/agenda/formulario-cita"
import { formatPrecio, formatearFechaLarga } from "@/lib/agenda-format"

interface Seleccion {
  fechaIso: string
  bloque: string
  resumen: string
}

export function AgendaHorario({
  modalidad,
  modalidadSlug,
  slotsIniciales,
}: {
  modalidad: { nombre: string; costo: number }
  modalidadSlug: string
  slotsIniciales: BloqueSemana[]
}) {
  const [seleccionado, setSeleccionado] = useState<Seleccion | null>(null)

  function manejarSeleccion(fechaIso: string, bloque: string) {
    setSeleccionado({
      fechaIso,
      bloque,
      resumen: `${formatearFechaLarga(new Date(fechaIso))}, ${bloque}`,
    })
  }

  return (
    <div className="pb-16">
      {/* Misma retícula y proporción que la página 1: el calendario reemplaza al
          video, el formulario queda donde estaba la selección. */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-6 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2856c7]/[.07] px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B1D3A]">
                {modalidad.nombre}
              </span>
              <span className="text-xs text-[#0B1D3A]/60">·</span>
              <span className="text-xs tabular-nums text-[#0B1D3A]/70">
                {formatPrecio(modalidad.costo)}
              </span>
            </div>
            <Link
              href="/agenda/modalidad"
              className="text-sm text-[#2856c7] underline underline-offset-4 transition-colors hover:text-[#1c46a8]"
            >
              Cambiar modalidad
            </Link>
          </div>

          <Calendario
            modalidadId={modalidadSlug}
            modalidadSlug={modalidadSlug}
            inicial={slotsIniciales}
            seleccionado={seleccionado?.fechaIso ?? null}
            onSelect={manejarSeleccion}
          />
        </div>

        <div className="mt-12 lg:col-span-6 lg:mt-0">
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0B1D3A] md:text-4xl">
            Elige día y hora
          </h1>
          <p className="mt-3 text-base leading-7 text-[#0B1D3A]/70">
            Lun a sáb. Confirmamos por WhatsApp.
          </p>

          <div className="mt-8">
            <FormularioCita
              modalidad={modalidad.nombre}
              modalidadSlug={modalidadSlug}
              seleccionado={seleccionado}
            />
          </div>

          <Link
            href="/agenda/modalidad"
            className="mt-8 inline-flex items-center gap-2 text-sm text-[#0B1D3A]/60 transition-colors hover:text-[#0B1D3A]"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </div>
      </div>
    </div>
  )
}
