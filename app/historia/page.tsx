import type { Metadata } from "next"
import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { Historia } from "@/components/tonfort/historia"

export const metadata: Metadata = {
  title: "Historia — Tonfort",
  description:
    "La historia de Tonfort: una empresa familiar nacida en Bogotá, reinventada en Santa Marta e impulsada por el amor, la resiliencia y el diseño.",
}

export default function HistoriaPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navigation solid />
      <Historia />
      <Footer />
    </main>
  )
}
