import { ButtonLink } from "@/components/tonfort/public-animations"
import { AGENDA_CTA } from "@/content/landing"

// Cierre de la landing. Fondo navy con glow beige: en oscuro el acento es el
// beige (design system §2.6), nunca navy sobre navy.
export function AgendaCta() {
  return (
    <section className="relative overflow-hidden bg-brand-navy section-y">
      <div className="tonfort-beige-glow pointer-events-none absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center md:px-10">
        <p className="eyebrow mb-5 text-warm-light">{AGENDA_CTA.eyebrow}</p>
        <h2 className="display-lg font-display text-white">{AGENDA_CTA.titulo}</h2>
        <p className="mx-auto mt-6 max-w-md text-base leading-7 text-white/70 md:text-lg">
          {AGENDA_CTA.bajada}
        </p>

        <div className="mt-10 flex justify-center">
          <ButtonLink href="/agenda/modalidad" variant="vivid" size="lg" ariaLabel="Agendar cita">
            {AGENDA_CTA.cta}
          </ButtonLink>
        </div>
        <p className="mt-4 text-xs text-white/50">{AGENDA_CTA.nota}</p>
      </div>
    </section>
  )
}
