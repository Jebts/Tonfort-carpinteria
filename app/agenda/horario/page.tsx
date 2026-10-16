import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { WHATSAPP_URL } from "@/lib/contact"
import { getClientIp } from "@/lib/rate-limit"
import { getServiceSupabase } from "@/lib/supabase/server"
import {
  calcularDisponibilidad,
  getModalidadPorSlug,
  tieneCitaRecientePorIP,
} from "@/lib/citas-service"
import { AgendaHorario } from "@/components/tonfort/agenda/agenda-horario"
import type { BloqueSemana } from "@/components/tonfort/agenda/calendario"

export const metadata: Metadata = {
  title: "Elige tu horario · Tonfort",
  description: "Elige el día y la hora de tu cita de diseño (1 h 30 m dentro de bloques de 2 h, con 30 min de gabela).",
  robots: { index: false },
}

export const dynamic = "force-dynamic"

export default async function AgendaHorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const heads = await headers()
  const ip = getClientIp({ headers: heads })
  if (ip) {
    const supabase = getServiceSupabase()
    if (supabase && (await tieneCitaRecientePorIP(supabase, ip))) {
      redirect("/agenda/solicitud-recibida?ya_tienes_cita=1")
    }
  }

  const query = await searchParams
  const rawModalidad = Array.isArray(query.modalidad) ? query.modalidad[0] : query.modalidad
  const modalidad = rawModalidad ? await getModalidadPorSlug(rawModalidad) : null

  // Sin modalidad válida no hay calendario: se vuelve al paso 1.
  if (!modalidad || !modalidad.slug) notFound()

  // La disponibilidad se resuelve por modalidad: un bloque con cita `virtual`
  // aceptada sigue libre para quien eligió `presencial`.
  const desde = new Date()
  const hasta = new Date(desde)
  hasta.setUTCDate(hasta.getUTCDate() + 14)

  const slots = await calcularDisponibilidad(desde, hasta, {
    incluirCanceladas: false,
    modalidadId: modalidad.id,
  })

  // Contadores del bloque (en espera / canceladas) sin datos de contacto: la
  // grilla los pinta como círculos encima de cada celda.
  const slotsIniciales: BloqueSemana[] = slots.map((s) => ({
    fecha_hora: s.fecha_hora,
    estado: s.estado,
    enEspera: s.enEspera,
    canceladas: s.canceladas,
  }))

  return (
    <div className="pb-16">
      <AgendaHorario
        modalidad={{ nombre: modalidad.nombre, costo: modalidad.costo }}
        modalidadSlug={modalidad.slug}
        slotsIniciales={slotsIniciales}
      />

      <p className="mt-12 text-sm text-[#0B1D3A]/50">
        ¿Prefieres hablar antes?{" "}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 transition-colors hover:text-[#0B1D3A]"
        >
          Escríbenos por WhatsApp
        </a>{" "}
        o{" "}
        <Link
          href="/sede"
          className="underline underline-offset-4 transition-colors hover:text-[#0B1D3A]"
        >
          visítanos
        </Link>
        .
      </p>
    </div>
  )
}
