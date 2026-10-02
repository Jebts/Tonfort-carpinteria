import type { CategoriaMueble, SedeTaller } from "@/lib/supabase/types"
import { ETIQUETA_CATEGORIA, ETIQUETA_SEDE, SLUG_SEDE } from "@/lib/supabase/types"
import { esCategoriaMueble } from "@/lib/categorias"

// Adaptador entre la capa de datos (`lib/portfolio-service`) y los componentes
// de la landing y del portafolio. Antes devolvía `category: "Sin categoría"` e
// `image: "/placeholder.svg"` para todo, que es lo que vaciaba los filtros.

export interface PublicProject {
  id: string
  slug: string
  titulo: string
  descripcion: string | null
  sede: SedeTaller
  categoria: CategoriaMueble | null
  portada_url: string | null
  created_at: string
  // Derivadas para pintar sin volver al catálogo.
  category: string
  image: string
  title: string
  href: string
}

// Imagen de respaldo cuando el proyecto no tiene portada en la BD.
export const FALLBACK_PORTADA = "/tonfort-closet-render.png"

export function mapToPublicProject(proyecto: {
  id: string
  slug: string
  titulo: string
  descripcion: string | null
  sede: SedeTaller
  categoria: CategoriaMueble | null
  portada_url: string | null
  created_at: string
}): PublicProject {
  return {
    id: proyecto.id,
    slug: proyecto.slug,
    titulo: proyecto.titulo,
    descripcion: proyecto.descripcion,
    sede: proyecto.sede,
    categoria: proyecto.categoria,
    portada_url: proyecto.portada_url,
    created_at: proyecto.created_at,
    category: proyecto.categoria ? ETIQUETA_CATEGORIA[proyecto.categoria] : "Sin categoría",
    image: proyecto.portada_url ?? FALLBACK_PORTADA,
    title: proyecto.titulo,
    href: `/portafolio/${SLUG_SEDE[proyecto.sede]}/${proyecto.slug}`,
  }
}

export function filterProjectsByCategory(
  projects: PublicProject[],
  category: CategoriaMueble | "todos",
): PublicProject[] {
  if (category === "todos") return projects
  return projects.filter((p) => p.categoria === category)
}

export async function getPublicProjects(
  filtros: { sede?: SedeTaller | null; categoria?: CategoriaMueble | null; limite?: number | null } = {},
): Promise<PublicProject[]> {
  const { getProyectosPublicados } = await import("@/lib/portfolio-service")
  const proyectos = await getProyectosPublicados(filtros)
  return proyectos.map(mapToPublicProject)
}

export async function getProjectBySlug(slug: string): Promise<PublicProject | null> {
  const { getProyectoPublicadoPlano } = await import("@/lib/portfolio-service")
  const result = await getProyectoPublicadoPlano(slug)
  if (!result) return null
  return mapToPublicProject(result.proyecto)
}

// Etiqueta legible de la sede, para breadcrumbs y metadatos.
export function etiquetaSede(sede: SedeTaller): string {
  return ETIQUETA_SEDE[sede]
}

// Resuelve el query param `?categoria=` a un valor del catálogo cerrado.
// Cualquier valor desconocido cae en `null` (= "Todos").
export function parseCategoriaParam(valor: string | null | undefined): CategoriaMueble | null {
  if (!valor) return null
  return esCategoriaMueble(valor) ? valor : null
}