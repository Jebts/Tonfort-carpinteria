import { FondoBurbujas } from "@/components/tonfort/landing/fondo-burbujas"
import { ButtonLink } from "@/components/tonfort/public-animations"
import { AGENDA_CTA } from "@/content/landing"

// Cierre de la landing. Navy con el fondo de burbujas: el video va detrás del
// copy y se carga diferido (ver `fondo-burbujas.tsx`).
export function AgendaCta() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-navy section-y">
      <FondoBurbujas />

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