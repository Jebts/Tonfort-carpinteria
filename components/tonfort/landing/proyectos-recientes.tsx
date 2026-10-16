import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { getProyectosPublicados } from "@/lib/portfolio-service"
import { ETIQUETA_CATEGORIA, SLUG_SEDE } from "@/lib/supabase/types"
import { PROYECTOS } from "@/content/landing"
import { FALLBACK_PORTADA } from "@/components/tonfort/public-data"

const REPETICIONES = 3

// Los 3 primeros proyectos publicados por número de presentación, mezclando las
// dos sedes: sin `sede` la query mezcla Bogotá y Santa Marta y ordena por
// `orden`. El servicio ya lo hace, así que aquí no hay nada que reordenar.
// Si la BD no devuelve ninguno, la sección no se renderiza: antes se rellenaba
// con `PROYECTOS_FALLBACK`, que eran fotos de render sin proyecto detrás.
export async function ProyectosRecientes() {
  const proyectos = await getProyectosPublicados({ limite: REPETICIONES })

  if (proyectos.length === 0) return null

  return (
    <section className="section-y bg-black">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-4 text-royal-bright">{PROYECTOS.eyebrow}</p>
            <h2 className="display-lg font-display max-w-2xl text-white">{PROYECTOS.titulo}</h2>
          </div>
          <Link
            href="/portafolio"
            className="group inline-flex items-center gap-2 text-sm text-copy transition-colors hover:text-white"
          >
            {PROYECTOS.cta}
            <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {proyectos.map((p) => {
            const categoria = p.categoria ? ETIQUETA_CATEGORIA[p.categoria] : null

            return (
              <Link
                key={p.id}
                href={`/portafolio/${SLUG_SEDE[p.sede]}/${p.slug}`}
                className="group block"
              >
                {/* Las portadas son 1024×1024: `aspect-square` es la proporción real. */}
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-elevated">
                  <Image
                    src={p.portada_url ?? FALLBACK_PORTADA}
                    alt={p.titulo}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {categoria && (
                    <p className="eyebrow absolute left-4 top-4 text-warm-light">{categoria}</p>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <h3 className="text-xl tracking-[-0.03em] text-white">{p.titulo}</h3>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-white/40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}