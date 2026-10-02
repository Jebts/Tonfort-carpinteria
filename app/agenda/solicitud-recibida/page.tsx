import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"
import { getModalidadPorSlug } from "@/lib/citas-service"
import { formatPrecio, formatearFechaLarga } from "@/lib/agenda-format"

export const metadata: Metadata = {
  title: "Solicitud recibida · Tonfort",
  robots: { index: false },
}

export const dynamic = "force-dynamic"

function primero(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

export default async function AgendaSolicitudRecibidaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const query = await searchParams

  // El resumen es informativo: si el cliente entra sin query params, la página
  // sigue funcionando, solo sin el detalle.
  const slugModalidad = primero(query.modalidad)
  const modalidad = slugModalidad ? await getModalidadPorSlug(slugModalidad) : null

  const fechaIso = primero(query.fecha)
  const fecha = fechaIso ? new Date(fechaIso) : null
  const fechaValida = fecha && !Number.isNaN(fecha.getTime()) ? fecha : null
  const bloque = primero(query.bloque)

  const mostrarResumen = Boolean(modalidad || fechaValida || bloque)

  return (
    <div className="mx-auto max-w-2xl py-12 text-center md:py-20">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#0B1D3A] text-white">
        <Check className="size-8" aria-hidden />
      </span>

      <p className="mt-8 text-xs uppercase tracking-[0.28em] text-[#2856c7]">
        Solicitud recibida
      </p>
      <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.04em] text-[#0B1D3A]">
        El diseñador se pondrá en contacto contigo.
      </h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#0B1D3A]/70">
        Revisamos tu solicitud y te escribimos por WhatsApp.
      </p>

      {mostrarResumen && (
        <dl className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-white px-6 py-2 text-left">
          {modalidad && (
            <div className="flex items-center justify-between border-b border-border py-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-[#0B1D3A]/50">
                Modalidad
              </dt>
              <dd className="text-sm font-medium text-[#0B1D3A]">{modalidad.nombre}</dd>
            </div>
          )}
          {fechaValida && (
            <div className="flex items-center justify-between gap-6 border-b border-border py-4">
              <dt className="shrink-0 text-xs uppercase tracking-[0.2em] text-[#0B1D3A]/50">
                Fecha
              </dt>
              <dd className="text-right text-sm font-medium capitalize text-[#0B1D3A]">
                {formatearFechaLarga(fechaValida)}
                {bloque && <span className="block text-[#0B1D3A]/60">{bloque}</span>}
              </dd>
            </div>
          )}
          {modalidad && modalidad.costo > 0 && (
            <div className="flex items-center justify-between py-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-[#0B1D3A]/50">Valor</dt>
              <dd className="text-sm font-medium tabular-nums text-[#0B1D3A]">
                {formatPrecio(modalidad.costo)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <Link
          href="/portafolio/santa-marta"
          className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#2856c7] px-8 font-semibold text-white transition hover:bg-[#1c46a8] active:scale-[.98]"
        >
          Ver portafolio
        </Link>
        <Link
          href="/"
          className="inline-flex h-[52px] items-center justify-center rounded-full border border-[#0B1D3A]/25 px-8 font-semibold text-[#0B1D3A] transition hover:border-[#0B1D3A]/50 active:scale-[.98]"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
