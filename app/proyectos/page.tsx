import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { ProyectosExplorador } from "@/components/tonfort/proyectos-explorador"
import { getProyectosPublicados } from "@/lib/proyectos-service"

export const dynamic = "force-dynamic"

export default async function ProyectosPage() {
  const proyectos = await getProyectosPublicados()
  const portada = proyectos[0]?.imagen_portada || "/images/space-wide.png"

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navigation />

      {/* Hero cinematográfico */}
      <section className="relative h-[70svh] min-h-[420px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portada}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a12] via-[#050a12]/55 to-[#050a12]/30" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-12 lg:px-10 lg:pb-16">
          <p className="eyebrow text-white/70">Portafolio</p>
          <h1 className="display-lg mt-4 max-w-3xl text-balance font-display text-white">
            Espacios que dejaron de ser muebles para volverse atmósfera.
          </h1>
          <p className="mt-5 max-w-xl text-pretty leading-relaxed text-white/80">
            Un diario visual de proyectos reales. Filtra por categoría o busca el
            espacio que imaginas para tu casa.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        {proyectos.length === 0 ? (
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 text-center">
              <p className="text-muted-foreground">
                Pronto mostraremos aquí los primeros proyectos de tonfort. Mientras tanto,
                conversa con nosotros en el{" "}
                <a href="/agenda" className="text-foreground underline underline-offset-4">
                  agenda
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <ProyectosExplorador proyectos={proyectos} />
        )}
      </section>

      <Footer />
    </main>
  )
}
