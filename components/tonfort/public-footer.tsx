import Link from "next/link"
import { SEDE } from "@/lib/contact"
import type { Tone } from "@/components/tonfort/public-animations"

export function PublicFooter({ tone = "dark" }: { tone?: Tone }) {
  const light = tone === "light"
  const linkTone = light
    ? "text-brand-navy/70 transition-colors hover:text-brand-navy"
    : "text-copy transition-colors hover:text-white"
  const columnLabel = light ? "text-brand-navy/60" : "text-white/50"

  return (
    <footer
      className={
        light
          ? "border-t border-brand-beige bg-background px-6 py-24 text-brand-navy/60 md:px-10 md:py-32"
          : "bg-black px-6 py-24 text-copy/70 md:px-10 md:py-32"
      }
    >
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p
            className={`mb-4 text-sm font-bold tracking-[0.28em] ${light ? "text-brand-navy" : "text-white"}`}
          >
            TONFORT
          </p>
          <p className="max-w-xs text-sm leading-6">
            Diseño y fabricación de espacios a medida desde Santa Marta.
          </p>
        </div>

        <div>
          <p className={`eyebrow mb-4 ${columnLabel}`}>Explora</p>
          <div className="flex flex-col gap-3 text-sm">
            <Link href="/sede" className={linkTone}>
              Sede
            </Link>
            <Link href="/portafolio/santa-marta" className={linkTone}>
              Portafolio · Santa Marta
            </Link>
            <Link href="/portafolio/bogota" className={linkTone}>
              Portafolio · Bogotá
            </Link>
            <Link href="/historia" className={linkTone}>
              Historia
            </Link>
            <Link href="/agenda/modalidad" className={linkTone}>
              Agendar cita
            </Link>
          </div>
        </div>

        <div>
          <p className={`eyebrow mb-4 ${columnLabel}`}>La sede</p>
          <div className="flex flex-col gap-3 text-sm">
            <span className="text-inherit">{SEDE.direccion}</span>
            <a href={SEDE.telefonoUrl} className={linkTone}>
              {SEDE.telefono}
            </a>
            <a href={SEDE.whatsapp} target="_blank" rel="noopener noreferrer" className={linkTone}>
              WhatsApp
            </a>
            <a href={SEDE.instagram} target="_blank" rel="noopener noreferrer" className={linkTone}>
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div
        className={`mx-auto mt-16 flex max-w-7xl justify-between border-t pt-5 text-xs ${
          light ? "border-brand-beige text-brand-navy/60" : "border-white/10 text-copy/70"
        }`}
      >
        <span>© {new Date().getFullYear()} Tonfort</span>
        <span>{SEDE.barrio}</span>
        <Link
          href="/staff/login"
          className={
            light
              ? "transition-colors hover:text-brand-navy"
              : "transition-colors hover:text-white"
          }
        >
          Staff
        </Link>
      </div>
    </footer>
  )
}
