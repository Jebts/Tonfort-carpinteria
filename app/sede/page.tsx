import Image from "next/image"
import { MapPin, MessageCircle, Navigation, Clock, Phone, Mail } from "lucide-react"
import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import { SedeMapa } from "@/components/tonfort/sede-mapa"
import { ButtonLink, GradientText, ParallaxImage, Reveal } from "@/components/tonfort/public-animations"
import { SEDE, SEDE_PENDIENTE_DATOS } from "@/lib/contact"
import { SEDE_DATOS, SEDE_FOTOS, SEDE_HERO, SEDE_PUNTOS, SEDE_VIDEO } from "@/content/sede"

// Los datos de contacto vienen de `lib/contact.ts`. Si aún tienen marcadores
// `<...>`, el mapa no puede cargar: se avisa en desarrollo en vez de fallar en
// silencio.
const ICONO_DATO = {
  direccion: MapPin,
  telefono: Phone,
  whatsapp: MessageCircle,
  horario: Clock,
  email: Mail,
} as const

export default function SedePage() {
  const ancha = SEDE_FOTOS.find((f) => f.layout === "ancho")
  const cuadros = SEDE_FOTOS.filter((f) => f.layout === "cuadro")
  const cuadradas = SEDE_FOTOS.filter((f) => f.layout === "cuadrado")

  return (
    <main className="bg-black">
      <PublicNavbar />

      {/* 1. Hero a sangre */}
      <section className="relative flex min-h-[100svh] w-full items-end overflow-hidden bg-black">
        <Image
          src={SEDE_HERO.src}
          alt={SEDE_HERO.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-20">
          <h1 className="max-w-4xl text-[clamp(2.75rem,7vw,6rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white">
            {SEDE_HERO.tituloLineas.map((linea, i) => (
              <span key={linea} className="block">
                {i === SEDE_HERO.tituloLineas.length - 1 ? (
                  <GradientText>{linea}</GradientText>
                ) : (
                  linea
                )}
              </span>
            ))}
          </h1>
        </div>
      </section>

      {/* 2. Video de presentación */}
      <section className="relative min-h-[70svh] overflow-hidden bg-gradient-to-b from-black to-[#050505] py-20">
        <video
          src={SEDE_VIDEO.src}
          poster={SEDE_VIDEO.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Presentación del taller de Tonfort"
          className="mx-auto aspect-video w-full max-w-6xl rounded-2xl object-cover"
        />
      </section>

      {/* 3. Fotos */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          {ancha && (
            <div className="group relative overflow-hidden rounded-2xl ring-1 ring-white/10 transition duration-500 hover:ring-white/25">
              <ParallaxImage
                src={ancha.src}
                alt={ancha.alt}
                sizes="100vw"
                className="aspect-[16/10] w-full"
                hover
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          )}
          {cuadros.length > 0 && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cuadros.map((foto) => (
                <div
                  key={foto.src}
                  className="group relative overflow-hidden rounded-2xl ring-1 ring-white/10 transition duration-500 hover:ring-white/25"
                >
                  <ParallaxImage
                    src={foto.src}
                    alt={foto.alt}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="aspect-[4/5] w-full"
                    hover
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
          {cuadradas.length > 0 && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {cuadradas.map((foto) => (
                <div
                  key={foto.src}
                  className="group relative overflow-hidden rounded-2xl ring-1 ring-white/10 transition duration-500 hover:ring-white/25"
                >
                  <ParallaxImage
                    src={foto.src}
                    alt={foto.alt}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="aspect-square w-full"
                    hover
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Datos de la sede */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium leading-tight tracking-[-0.04em] text-white">
            Cómo llegar
          </h2>
          <dl className="border-t border-white/10">
            {SEDE_DATOS.map((dato) => {
              const Icono = ICONO_DATO[dato.label.toLowerCase() as keyof typeof ICONO_DATO]
              return (
                <div
                  key={dato.label}
                  className="grid gap-1 border-b border-white/10 py-5 md:grid-cols-[200px_1fr] md:gap-6"
                >
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50">
                    {Icono && <Icono className="size-3.5" aria-hidden />}
                    {dato.label}
                  </dt>
                  <dd className="text-base text-white">
                    {dato.href ? (
                      <a
                        href={dato.href}
                        target={dato.href.startsWith("http") ? "_blank" : undefined}
                        rel={dato.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="underline underline-offset-4 transition-colors hover:text-[#f4d6a0]"
                      >
                        {dato.value}
                      </a>
                    ) : (
                      dato.value
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </section>

      {/* 5. Mapa */}
      <section className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto max-w-5xl">
          <SedeMapa embedUrl={SEDE.mapsEmbedUrl} direccion={SEDE.direccion} />

          {SEDE_PENDIENTE_DATOS && process.env.NODE_ENV === "development" && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              Faltan datos reales de la sede en <code>lib/contact.ts</code> (
              <code>SEDE.direccion</code>, <code>SEDE.coordenadas</code> y <code>SEDE.mapsEmbedUrl</code>).
              El mapa de arriba no puede cargar hasta reemplazarlos.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href={SEDE.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:border-white/50 active:scale-95"
            >
              <Navigation className="size-4" />
              Cómo llegar
            </a>
            <a
              href={SEDE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:border-white/50 active:scale-95"
            >
              <MessageCircle className="size-4" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* 6. Puntos */}
      <section className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3 md:gap-8">
          {SEDE_PUNTOS.map((punto, i) => (
            <Reveal key={punto.titulo} className="border-t border-white/10 pt-6">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#f4d6a0]">
                {String(i + 1).padStart(2, "0")} · {punto.titulo}
              </p>
              <p className="mt-3 text-lg leading-7 text-white">{punto.texto}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 7. CTA */}
      <section className="relative overflow-hidden bg-[#0B1D3A] py-24 md:py-32">
        <div className="tonfort-beige-glow pointer-events-none absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center md:px-10">
          <h2 className="text-[clamp(2.25rem,5vw,4rem)] font-medium leading-[0.95] tracking-[-0.05em] text-white">
            ¿Quieres verlo de cerca?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/70">
            Agenda una visita o una videollamada desde cero.
          </p>
          <div className="mt-9 flex justify-center">
            <ButtonLink href="/agenda/modalidad" variant="vivid" size="lg" ariaLabel="Agendar cita">
              Agendar cita
            </ButtonLink>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
