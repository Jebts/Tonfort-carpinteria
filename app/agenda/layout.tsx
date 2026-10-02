import { PublicNavbar } from "@/components/tonfort/public-navbar"
import { PublicFooter } from "@/components/tonfort/public-footer"
import { Toaster } from "@/components/ui/sonner"

// La agenda es el único flujo en modo claro: el formulario tiene que leerse
// sin Volvemos al negro del resto del sitio. Se mantiene el `Toaster` para los
// errores de envío.
export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F4EE] text-[#0B1D3A]">
      <PublicNavbar tone="light" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pt-28 lg:px-10 lg:pt-32">
        {children}
      </main>
      <div className="mt-20">
        <PublicFooter tone="light" />
      </div>
      <Toaster theme="light" />
    </div>
  )
}
