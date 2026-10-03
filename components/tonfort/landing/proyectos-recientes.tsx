import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { getProyectosPublicados } from "@/lib/portfolio-service"
import { ETIQUETA_CATEGORIA, SLUG_SEDE } from "@/lib/supabase/types"
import { PROYECTOS, PROYECTOS_FALLBACK } from "@/content/landing"
import { FALLBACK_PORTADA } from "@/components/tonfort/public-data"

const REPETICIONES = 3

interface Tarjeta {
  key: string
  titulo: string
  categoria: string | null
  href: string | null
  image: string
}

// Los 3 proyectos más recientes publicados de Santa Marta. Si la BD no tiene
// 3, se completa con fotos de `/public` para que la sección no quede coja.
export async function ProyectosRecientes() {
  const proyectos = await getProyectosPublicados({
    sede: "santa_marta",
    limite: REPETICIONES,
  })

  const tarjetas: Tarjeta[] = proyectos.map((p) => ({
    key: p.id,
    titulo: p.titulo,
    categoria: p.categoria ? ETIQUETA_CATEGORIA[p.categoria] : null,
    href: `/portafolio/${SLUG_SEDE[p.sede]}/${p.slug}`,
    image: p.portada_url ?? FALLBACK_PORTADA,
  }))

  for (const [i, fallback] of PROYECTOS_FALLBACK.entries()) {
    if (tarjetas.length >= REPETICIONES) break
    tarjetas.push({
      key: `fallback-${i}`,
      titulo: fallback.titulo,
      categoria: null,
      href: null,
      image: fallback.image,
    })
  }

  return (
    <section className="section-y bg-black">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-4 text-royal-bright">{PROYECTOS.eyebrow}</p>
            <h2 className="display-lg font-display max-w-2xl text-white">{PROYECTOS.titulo}</h2>
          </div>
          <Link
            href="/portafolio/santa-marta"
            className="group inline-flex items-center gap-2 text-sm text-copy transition-colors hover:text-white"
          >
            {PROYECTOS.cta}
            <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tarjetas.map((tarjeta, i) => {
            // La segunda imagen baja 12%: desfase del ritmo editorial.
            const desfase = i === 1 ? "md:translate-y-12" : ""

            const contenido = (
              <>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-elevated">
                  <Image
                    src={tarjeta.image}
                    alt={tarjeta.titulo}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {tarjeta.categoria && (
                    <p className="eyebrow absolute left-4 top-4 text-warm-light">
                      {tarjeta.categoria}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <h3 className="text-xl tracking-[-0.03em] text-white">{tarjeta.titulo}</h3>
                  {tarjeta.href && (
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-white/40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                  )}
                </div>
              </>
            )

            return (
              <div key={tarjeta.key} className={desfase}>
                {tarjeta.href ? (
                  <Link href={tarjeta.href} className="group block">
                    {contenido}
                  </Link>
                ) : (
                  <div className="block opacity-70">{contenido}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
