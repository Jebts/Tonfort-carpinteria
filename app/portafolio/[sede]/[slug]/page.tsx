import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import { ButtonLink, GradientText, ParallaxImage } from "@/components/tonfort/public-animations"
import { LandingVisor } from "@/components/tonfort/landing-visor"
import { getProyectosPublicados, getProyectoPublicadoPlano } from "@/lib/portfolio-service"
import { ETIQUETA_CATEGORIA, ETIQUETA_SEDE, SLUG_SEDE } from "@/lib/supabase/types"
import { FALLBACK_PORTADA } from "@/components/tonfort/public-data"

// Página dinámica: depende de la BD, no se prerenderiza.
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const datos = await getProyectoPublicadoPlano(slug)
  if (!datos) return {}

  const { proyecto } = datos
  const sede = ETIQUETA_SEDE[proyecto.sede]
  const description =
    (proyecto.descripcion?.trim().slice(0, 155) || null) ??
    `${proyecto.titulo}, proyecto de ${sede} por Tonfort.`

  return {
    title: `${proyecto.titulo} — Tonfort ${sede}`,
    description,
    openGraph: {
      title: `${proyecto.titulo} — Tonfort ${sede}`,
      description,
      ...(proyecto.portada_url ? { images: [{ url: proyecto.portada_url }] } : {}),
    },
    alternates: { canonical: `/portafolio/${SLUG_SEDE[proyecto.sede]}/${proyecto.slug}` },
  }
}

// Fotos de respaldo cuando el proyecto no tiene galería en `proyectos_fotos`.
const FOTOS_FALLBACK = [
  { src: "/tonfort-closet-render.png", alt: "Vista del proyecto" },
  { src: "/portfolio-kitchen-light.png", alt: "Detalle del proyecto" },
]

export default async function ProyectoPlanoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const datos = await getProyectoPublicadoPlano(slug)
  if (!datos) notFound()

  const { proyecto, fotos, visor } = datos
  const sedeSlug = SLUG_SEDE[proyecto.sede]
  const etiquetaSede = ETIQUETA_SEDE[proyecto.sede]

  // "Siguiente proyecto": el más reciente de la misma sede distinto a este.
  const hermanos = await getProyectosPublicados({ sede: proyecto.sede })
  const siguiente = hermanos.find((p) => p.id !== proyecto.id)

  const galeria = fotos.length > 0
    ? fotos.map((f) => ({ src: f.url, alt: f.alt ?? proyecto.titulo }))
    : FOTOS_FALLBACK

  // La descripción se parte por párrafos en blanco.
  const parrafos = (proyecto.descripcion ?? "").split(/\n\s*\n/).filter(Boolean)

  return (
    <main className="bg-black">
      <PublicNavbar />

      {/* 1. Portada a sangre completa */}
      <section className="relative flex h-[85svh] w-full items-end overflow-hidden bg-black">
        <Image
          src={proyecto.portada_url ?? FALLBACK_PORTADA}
          alt={proyecto.titulo}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-20">
          {proyecto.categoria && (
            <p className="mb-5 text-xs uppercase tracking-[0.34em] text-[#f4d6a0]">
              {ETIQUETA_CATEGORIA[proyecto.categoria]}
            </p>
          )}
          <h1 className="max-w-4xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white">
            <GradientText>{proyecto.titulo}</GradientText>
          </h1>
          <p className="mt-5 text-sm uppercase tracking-[0.2em] text-white/60">{etiquetaSede}</p>
        </div>
      </section>

      {/* 2. Descripción */}
      {parrafos.length > 0 && (
        <section className="px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-2xl">
            {parrafos.map((parrafo, i) => (
              <p key={i} className="mb-5 text-pretty text-base leading-7 text-[#a1a1a6] last:mb-0">
                {parrafo}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 3. Visor 3D. Solo Santa Marta y solo si hay propuesta publicada;
             si no hay, la sección se omite sin dejar hueco. */}
      {visor && (
        <LandingVisor
          layout="inline"
          videoGlobalUrl={visor.video_global_url}
          frameCentroMs={visor.frame_centro_ms}
          animaciones={visor.animaciones}
          eyebrow="Visor 3D"
          titulo={proyecto.titulo}
        />
      )}

      {/* 4. Galería */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="columns-1 gap-6 md:columns-2">
            {galeria.map((foto, i) => (
              <div key={`${foto.src}-${i}`} className="mb-6 break-inside-avoid">
                <ParallaxImage
                  src={foto.src}
                  alt={foto.alt}
                  className="aspect-[4/5] w-full rounded-2xl"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pie */}
      <section className="border-t border-white/10 px-6 py-20 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8">
          <div className="flex flex-col gap-4">
            {siguiente && (
              <Link
                href={`/portafolio/${sedeSlug}/${siguiente.slug}`}
                className="group inline-flex items-center gap-3 text-lg text-white transition-colors hover:text-[#f4d6a0]"
              >
                <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" />
                Siguiente proyecto
              </Link>
            )}
            <Link
              href={`/portafolio/${sedeSlug}`}
              className="text-sm text-[#a1a1a6] transition-colors hover:text-white"
            >
              Ver todos los de {etiquetaSede}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/agenda/modalidad" variant="vivid" size="lg">
              <CalendarCheck className="mr-2 size-4" />
              Agendar cita
            </ButtonLink>
            {siguiente && (
              <Link
                href={`/portafolio/${sedeSlug}/${siguiente.slug}`}
                aria-label={`Ver ${siguiente.titulo}`}
                className="inline-flex items-center gap-2 text-sm text-[#a1a1a6] transition-colors hover:text-white"
              >
                {siguiente.titulo}
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
