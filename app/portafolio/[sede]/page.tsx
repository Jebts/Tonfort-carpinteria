import { notFound, permanentRedirect } from "next/navigation"
import { SEDES, SLUG_SEDE, type SedeTaller } from "@/lib/supabase/types"

// El portafolio ya no se parte por sede: `/portafolio` muestra las dos listas
// (Santa Marta y Bogotá) en la misma página. Las URLs por sede que quedaron
// por ahí —enlaces antiguos, el sitemap, marcadores— redirigen aquí.
// `/portafolio/[sede]/[slug]` sigue siendo la ficha de cada proyecto.

// `/portafolio/[sede]` acepta solo los slugs del catálogo: el resto es 404.
function resolveSede(slug: string): SedeTaller | null {
  const encontrada = SEDES.find((s) => SLUG_SEDE[s.value] === slug)
  return encontrada?.value ?? null
}

export default async function PortafolioSedeRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ sede: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { sede: slugSede } = await params
  if (!resolveSede(slugSede)) notFound()

  // El filtro de categoría se conserva: apuntaba a la sede, ahora a la página
  // única que contiene las dos listas.
  const query = await searchParams
  const rawCategoria = Array.isArray(query.categoria) ? query.categoria[0] : query.categoria

  permanentRedirect(rawCategoria ? `/portafolio?categoria=${rawCategoria}` : "/portafolio")
}
