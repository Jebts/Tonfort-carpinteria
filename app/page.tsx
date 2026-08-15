import { Navigation } from "@/components/tonfort/navigation"
import { Hero } from "@/components/tonfort/hero"
import { Manifesto } from "@/components/tonfort/manifesto"
import { Services } from "@/components/tonfort/services"
import { Lighting } from "@/components/tonfort/lighting"
import { Gallery } from "@/components/tonfort/gallery"
import { Process } from "@/components/tonfort/process"
import { Cta } from "@/components/tonfort/cta"
import { Footer } from "@/components/tonfort/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <Hero />
      <Manifesto />
      <Services />
      <Lighting />
      <Gallery />
      <Process />
      <Cta />
      <Footer />
    </main>
  )
}
