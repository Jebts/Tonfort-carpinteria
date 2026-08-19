import { Navigation } from "@/components/tonfort/navigation"
import { Footer } from "@/components/tonfort/footer"
import { AgendaPublica } from "@/components/tonfort/agenda-publica"
import { Toaster } from "@/components/ui/sonner"

export const dynamic = "force-dynamic"

export default function AgendaPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navigation />
      <AgendaPublica />
      <Footer />
      <Toaster />
    </main>
  )
}
