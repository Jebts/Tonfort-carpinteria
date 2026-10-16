import { ButtonLink } from "@/components/tonfort/public-animations"
import { WHATSAPP_URL } from "@/lib/contact"
import { CONTACTO_CTA } from "@/content/landing"

// Sección de contacto por WhatsApp, arriba del CTA de agenda.
// Fondo negro, texto a la izquierda y bastante aire.
export function ContactoCta() {
  return (
    <section className="relative isolate overflow-hidden bg-black section-y">
      <div className="relative mx-auto max-w-4xl px-6 md:px-10">
        <p className="eyebrow mb-5 text-warm-light">{CONTACTO_CTA.eyebrow}</p>
        <h2 className="display-lg font-display text-white">{CONTACTO_CTA.titulo}</h2>
        <p className="mt-6 max-w-md text-base leading-7 text-white/70 md:text-lg">
          {CONTACTO_CTA.bajada}
        </p>

        <div className="mt-10">
          <ButtonLink
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="vivid"
            size="lg"
            ariaLabel="Contactar por WhatsApp"
          >
            {CONTACTO_CTA.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
