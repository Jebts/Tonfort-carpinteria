import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { Reveal } from "@/components/tonfort/reveal"
import { HistoriaBloque } from "@/components/tonfort/historia-bloque"
import { HISTORIA_HERO, BLOQUES_HISTORIA } from "@/content/historia"

export const dynamic = "force-dynamic"

export default function HistoriaPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f7efe4]">
      <Navigation />

      <section className="relative overflow-hidden bg-[#f1e4d4] pb-20 pt-36 md:pt-40 lg:pt-44">
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-[#f2c89a] blur-[120px] opacity-50" aria-hidden />
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#b07429]">
              {HISTORIA_HERO.etiqueta}
            </p>
            <h1 className="display-lg mt-6 text-balance font-display text-[#3a2a1d]">
              {HISTORIA_HERO.titulo}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-[#5a4636]">
              {HISTORIA_HERO.subtitulo}
            </p>
          </Reveal>
        </div>
      </section>

      {BLOQUES_HISTORIA.map((bloque) => (
        <HistoriaBloque key={bloque.id} bloque={bloque} />
      ))}

      <section className="bg-[#3a2a1d] py-24 text-center">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <Reveal>
            <p className="font-display text-2xl leading-relaxed text-[#f7efe4] lg:text-3xl">
              Una familia, un taller, la misma luz de siempre. Gracias por estar aquí.
            </p>
            <a
              href="/agenda"
              className="mt-10 inline-block rounded-full bg-[#f2c89a] px-8 py-3 font-mono text-xs uppercase tracking-widest text-[#3a2a1d] transition-opacity hover:opacity-90"
            >
              Agendar una conversación
            </a>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  )
}
