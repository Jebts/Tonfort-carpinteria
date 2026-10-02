import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import {
  CinematicBand,
  ProjectCard,
} from "@/components/tonfort/public-animations"
import { getProyectosPublicados } from "@/lib/portfolio-service"
import {
  BAND_SEDE,
  FALLBACK_PORTADA,
  parseCategoriaParam,
} from "@/components/tonfort/public-data"
import { CATEGORIAS } from "@/lib/categorias"
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_SEDE,
  SEDES,
  SLUG_SEDE,
  type SedeTaller,
} from "@/lib/supabase/types"

// El listado depende de la BD y del filtro por query param.
export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return SEDES.map((s) => ({ sede: SLUG_SEDE[s.value] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sede: string }>
}): Promise<Metadata> {
  const sede = await resolveSede((await params).sede)
  if (!sede) return {}

  const etiqueta = ETIQUETA_SEDE[sede]
  const description =
    sede === "santa_marta"
      ? "Proyectos de muebles y espacios a medida fabricados en Santa Marta."
      : "Los primeros trabajos de Tonfort, antes de llegar a la costa."

  return {
    title: `Portafolio · ${etiqueta}`,
    description,
    alternates: { canonical: `/portafolio/${SLUG_SEDE[sede]}` },
  }
}

// `/portafolio/[sede]` acepta solo los slugs del catálogo: el resto es 404.
async function resolveSede(slug: string): Promise<SedeTaller | null> {
  const encontrada = SEDES.find((s) => SLUG_SEDE[s.value] === slug)
  return encontrada?.value ?? null
}

export default async function PortafolioSedePage({
  params,
  searchParams,
}: {
  params: Promise<{ sede: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { sede: slugSede } = await params
  const sede = await resolveSede(slugSede)
  if (!sede) notFound()

  const query = await searchParams
  const rawCategoria = Array.isArray(query.categoria) ? query.categoria[0] : query.categoria
  // Un valor fuera del catálogo cerrado cae en "Todos" en vez de romper.
  const categoria = parseCategoriaParam(rawCategoria)

  const proyectos = await getProyectosPublicados({ sede, categoria })
  const band = BAND_SEDE[sede]
  const otraSede = SEDES.find((s) => s.value !== sede)?.value

  return (
    <main className="bg-black">
      <PublicNavbar />

      <CinematicBand
        src={band.src}
        eyebrow={band.eyebrow}
        title={band.title}
        copy={band.copy}
        align="left"
      />

      <section className="relative px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          {/* Switch de sede: Links, no estado de cliente, para que sea
              enlazable y accesible con teclado y lector de pantalla. */}
          <nav aria-label="Sede del portafolio" className="mb-10">
            <div className="flex flex-wrap gap-2">
              {SEDES.map((s) => {
                const activa = s.value === sede
                const params = activa ? {} : categoria ? { categoria } : {}
                return (
                  <Link
                    key={s.value}
                    href={{ pathname: `/portafolio/${SLUG_SEDE[s.value]}`, query: params }}
                    aria-current={activa ? "page" : undefined}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ease-out ${
                      activa
                        ? "bg-[#3769e6] text-black shadow-[0_0_24px_rgba(55,105,230,.3)]"
                        : "border border-white/20 text-[#a1a1a6] hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Filtro por categoría: también por query param, para compartir URL. */}
          <nav aria-label="Categoría de mueble" className="mb-12">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/portafolio/${SLUG_SEDE[sede]}`}
                aria-current={!categoria ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                  !categoria ? "bg-white text-black" : "text-[#a1a1a6] hover:text-white"
                }`}
              >
                Todos
              </Link>
              {CATEGORIAS.map((c) => {
                const activa = c.value === categoria
                return (
                  <Link
                    key={c.value}
                    href={`/portafolio/${SLUG_SEDE[sede]}?categoria=${c.value}`}
                    aria-current={activa ? "page" : undefined}
                    title={c.copy}
                    className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                      activa
                        ? "bg-white text-black"
                        : "border border-white/15 text-[#a1a1a6] hover:text-white"
                    }`}
                  >
                    {c.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          {proyectos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 px-8 py-16 text-center">
              <p className="text-lg text-white">
                {categoria
                  ? "Todavía no hay proyectos publicados con esa categoría."
                  : "Todavía no hay proyectos publicados aquí."}
              </p>
              {otraSede && (
                <Link
                  href={`/portafolio/${SLUG_SEDE[otraSede]}`}
                  className="mt-6 inline-block text-sm text-[#a1a1a6] underline underline-offset-4 transition-colors hover:text-white"
                >
                  Ver los proyectos de {ETIQUETA_SEDE[otraSede]}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {proyectos.map((proyecto, i) => (
                <div key={proyecto.id} className={i % 3 === 1 ? "md:translate-y-10" : ""}>
                  <ProjectCard
                    project={{
                      title: proyecto.titulo,
                      // El label de categoría, nunca "Sin categoría" cuando sí la hay.
                      category: proyecto.categoria
                        ? ETIQUETA_CATEGORIA[proyecto.categoria]
                        : "Sin categoría",
                      image: proyecto.portada_url ?? FALLBACK_PORTADA,
                      href: `/portafolio/${SLUG_SEDE[proyecto.sede]}/${proyecto.slug}`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
