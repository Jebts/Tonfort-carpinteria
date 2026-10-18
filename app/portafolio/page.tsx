import Link from "next/link"
import type { Metadata } from "next"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import {
  CinematicBand,
  ProjectCard,
} from "@/components/tonfort/public-animations"
import { getProyectosPublicados, type ProyectoResumen } from "@/lib/portfolio-service"
import {
  BAND_SEDE,
  FALLBACK_PORTADA,
  parseCategoriaParam,
} from "@/components/tonfort/public-data"
import { CATEGORIAS } from "@/lib/categorias"
import {
  ETIQUETA_CATEGORIA,
  SEDES,
  SLUG_SEDE,
  type SedeTaller,
} from "@/lib/supabase/types"

// El listado depende de la BD y del filtro por query param.
export const dynamic = "force-dynamic"

export function generateMetadata(): Metadata {
  return {
    title: "Portafolio",
    description:
      "Los proyectos que salieron del taller de Santa Marta y los primeros trabajos de Tonfort en Bogotá.",
    alternates: { canonical: "/portafolio" },
  }
}

// El portafolio es una sola página con las dos sedes: Santa Marta primero y
// Bogotá —la sede histórica— después. Sin listas por sede en URLs separadas.
export default async function PortafolioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const query = await searchParams
  const rawCategoria = Array.isArray(query.categoria) ? query.categoria[0] : query.categoria
  // Un valor fuera del catálogo cerrado cae en "Todos" en vez de romper.
  const categoria = parseCategoriaParam(rawCategoria)

  // Una sola query alimenta las dos listas: sin `sede` vienen mezcladas y aquí
  // se reparten por sede, en el orden del catálogo (Santa Marta, Bogotá).
  const proyectos = await getProyectosPublicados({ categoria })
  const porSede: Record<SedeTaller, ProyectoResumen[]> = {
    santa_marta: [],
    bogota: [],
  }
  for (const proyecto of proyectos) {
    porSede[proyecto.sede].push(proyecto)
  }

  const band = BAND_SEDE.santa_marta

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
          {/* Filtro por categoría: por query param, para compartir URL. Aplica
              a las dos listas. */}
          <nav aria-label="Categoría de mueble" className="mb-12">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/portafolio"
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
                    href={`/portafolio?categoria=${c.value}`}
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

          {SEDES.map((sede, indice) => {
            const lista = porSede[sede.value]
            // Si la sede no tiene proyectos publicados, se omite por completo.
            if (lista.length === 0) return null

            const copy = BAND_SEDE[sede.value]
            return (
              <div
                key={sede.value}
                // La segunda sede se separa con una línea, no con otra página.
                className={indice === 0 ? "" : "mt-24 border-t border-white/10 pt-16"}
              >
                <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow text-warm-light">{copy.eyebrow}</p>
                    <h2 className="display-lg font-display mt-3 text-white">{copy.title}</h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[#a1a1a6]">{copy.copy}</p>
                  </div>
                  <p className="text-xs text-[#a1a1a6]">
                    {lista.length} {lista.length === 1 ? "proyecto" : "proyectos"}
                  </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {lista.map((proyecto, i) => (
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
              </div>
            )
          })}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
