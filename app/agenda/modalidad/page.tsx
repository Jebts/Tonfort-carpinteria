import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { WHATSAPP_URL } from "@/lib/contact"
import { getClientIp } from "@/lib/rate-limit"
import { getServiceSupabase } from "@/lib/supabase/server"
import {
  getModalidadesActivas,
  tieneCitaRecientePorIP,
} from "@/lib/citas-service"
import { SelectorModalidad, type ModalidadOpcion } from "@/components/tonfort/agenda/selector-modalidad"

export const metadata: Metadata = {
  title: "Agendar cita · Tonfort",
    description:
      "Elige cómo empezar: una cita virtual gratis o una visita presencial a tu domicilio. Las citas duran 1 h 30 m dentro de bloques de 2 h, con 30 min de gabela. Después eliges día y hora.",
  alternates: { canonical: "/agenda/modalidad" },
}

// El catálogo de modalidades es contenido editorial de la BD, no un asset.
export const dynamic = "force-dynamic"

// Copy de las tarjetas. El precio y la duración NO están aquí: se leen de
// `modalidades_cita` en cada request.
const BULLETS: Record<string, string[]> = {
  virtual: [
    "Videollamada en vivo con tu diseñador",
    "Prueba de iluminación en tiempo real",
    "Estimación de costos",
  ],
  presencial: [
    "Visita a tu domicilio",
    "Toma de medidas del espacio",
    "Diagnóstico del espacio",
  ],
}

const ICONO: Record<string, ModalidadOpcion["icono"]> = {
  virtual: "laptop",
  presencial: "map",
}

const ETIQUETA: Record<string, string> = {
  presencial: "Visita al domicilio",
}

export default async function AgendaModalidadPage() {
  const heads = await headers()
  const ip = getClientIp({ headers: heads })
  if (ip) {
    const supabase = getServiceSupabase()
    if (supabase && (await tieneCitaRecientePorIP(supabase, ip))) {
      redirect("/agenda/solicitud-recibida?ya_tienes_cita=1")
    }
  }

  const modalidades = await getModalidadesActivas()

  // Si el catálogo está vacío o no tiene exactamente 2 activas, el formulario
  // no se renderiza: es preferible un enlace a WhatsApp a un flujo roto.
  const completas = modalidades.length === 2
  const opciones: ModalidadOpcion[] = modalidades.map((m) => ({
    id: m.id,
    slug: m.slug ?? "",
    nombre: m.nombre,
    descripcion: m.descripcion,
    costo: m.costo,
    duracion_minutos: m.duracion_minutos,
    bullets: BULLETS[m.slug ?? ""] ?? [],
    etiqueta: m.slug ? ETIQUETA[m.slug] : undefined,
    icono: ICONO[m.slug ?? ""] ?? "laptop",
  }))

  if (!completas) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-3xl text-[#0B1D3A]">
          La agenda está en mantenimiento
        </h1>
        <p className="mt-4 text-base leading-7 text-[#0B1D3A]/70">
          No pudimos cargar las modalidades de cita. Escríbenos y te ayudamos directo.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex h-[52px] items-center justify-center rounded-full bg-[#2856c7] px-8 font-semibold text-white transition hover:bg-[#1c46a8]"
        >
          Escribir por WhatsApp
        </a>
      </div>
    )
  }

  return (
    <div className="pb-16">
      <SelectorModalidad opciones={opciones} />
      <p className="mt-12 text-sm text-[#0B1D3A]/50">
        ¿Prefieres hablar antes?{" "}
        <Link
          href="/sede"
          className="underline underline-offset-4 transition-colors hover:text-[#0B1D3A]"
        >
          Conoce la sede
        </Link>
        .
      </p>
    </div>
  )
}
