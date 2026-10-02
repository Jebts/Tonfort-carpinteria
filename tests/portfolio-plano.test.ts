import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  mapToPublicProject,
  filterProjectsByCategory,
  getPublicProjects,
  getProjectBySlug,
  etiquetaSede,
  parseCategoriaParam,
  FALLBACK_PORTADA,
  type PublicProject,
} from "@/components/tonfort/public-data"
import type { Proyecto } from "@/lib/supabase/types"

vi.mock("@/lib/portfolio-service", () => ({
  getProyectosPublicados: vi.fn(),
  getProyectoPublicadoPlano: vi.fn(),
}))

import {
  getProyectosPublicados,
  getProyectoPublicadoPlano,
} from "@/lib/portfolio-service"

beforeEach(() => {
  vi.mocked(getProyectosPublicados).mockReset()
  vi.mocked(getProyectoPublicadoPlano).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function proyectoBase(over: Partial<Proyecto> = {}): Proyecto {
  return {
    id: "p1",
    cliente_id: "c1",
    titulo: "Cocina Sol",
    slug: "cocina-sol",
    descripcion: "Cocina integral en madera",
    fase: "publicado",
    sede: "santa_marta",
    categoria: "cocina",
    portada_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  } as Proyecto
}

describe("mapToPublicProject", () => {
  it("deriva categoría, portada de respaldo y href plano", () => {
    const p = mapToPublicProject(proyectoBase())
    expect(p.category).toBe("Cocina")
    expect(p.image).toBe(FALLBACK_PORTADA)
    expect(p.title).toBe("Cocina Sol")
    // Ruta plana: /portafolio/[sede-slug]/[slug], sin anidamiento de productos.
    expect(p.href).toBe("/portafolio/santa-marta/cocina-sol")
    expect(p.sede).toBe("santa_marta")
    expect(p.categoria).toBe("cocina")
  })

  it("usa portada_url cuando existe", () => {
    const p = mapToPublicProject(
      proyectoBase({ portada_url: "https://cdn/portada.jpg" }),
    )
    expect(p.image).toBe("https://cdn/portada.jpg")
  })

  it("proyecto sin categoría → Sin categoría", () => {
    const p = mapToPublicProject(proyectoBase({ categoria: null }))
    expect(p.category).toBe("Sin categoría")
  })

  it("sede bogota → href con slug bogota", () => {
    const p = mapToPublicProject(proyectoBase({ sede: "bogota" }))
    expect(p.href).toBe("/portafolio/bogota/cocina-sol")
  })
})

describe("filterProjectsByCategory", () => {
  const proyectos: PublicProject[] = [
    mapToPublicProject(proyectoBase({ id: "1", slug: "a", categoria: "cocina" })),
    mapToPublicProject(proyectoBase({ id: "2", slug: "b", categoria: "closet" })),
    mapToPublicProject(proyectoBase({ id: "3", slug: "c", categoria: "cocina" })),
  ]

  it("todos → sin filtrar", () => {
    expect(filterProjectsByCategory(proyectos, "todos")).toHaveLength(3)
  })

  it("filtra por categoría exacta", () => {
    const cocina = filterProjectsByCategory(proyectos, "cocina")
    expect(cocina).toHaveLength(2)
    expect(cocina.every((p) => p.categoria === "cocina")).toBe(true)
  })

  it("categoría sin coincidencias → vacío", () => {
    expect(filterProjectsByCategory(proyectos, "iluminacion")).toHaveLength(0)
  })
})

describe("getPublicProjects", () => {
  it("pide los filtros al servicio y mapea", async () => {
    vi.mocked(getProyectosPublicados).mockResolvedValue([
      proyectoBase(),
    ] as never)
    const res = await getPublicProjects({
      sede: "santa_marta",
      categoria: "cocina",
      limite: 12,
    })
    expect(getProyectosPublicados).toHaveBeenCalledWith({
      sede: "santa_marta",
      categoria: "cocina",
      limite: 12,
    })
    expect(res).toHaveLength(1)
    expect(res[0].href).toBe("/portafolio/santa-marta/cocina-sol")
  })

  it("sin filtros → llamada vacía", async () => {
    vi.mocked(getProyectosPublicados).mockResolvedValue([])
    await getPublicProjects()
    expect(getProyectosPublicados).toHaveBeenCalledWith({})
  })
})

describe("getProjectBySlug", () => {
  it("mapea el proyecto del detalle plano", async () => {
    vi.mocked(getProyectoPublicadoPlano).mockResolvedValue({
      proyecto: proyectoBase(),
      fotos: [],
      visor: null,
    } as never)
    const res = await getProjectBySlug("cocina-sol")
    expect(getProyectoPublicadoPlano).toHaveBeenCalledWith("cocina-sol")
    expect(res?.slug).toBe("cocina-sol")
    expect(res?.href).toBe("/portafolio/santa-marta/cocina-sol")
  })

  it("slug inexistente → null", async () => {
    vi.mocked(getProyectoPublicadoPlano).mockResolvedValue(null)
    expect(await getProjectBySlug("no-existe")).toBeNull()
  })
})

describe("etiquetaSede", () => {
  it("devuelve la etiqueta legible de la sede", () => {
    expect(etiquetaSede("santa_marta")).toBe("Santa Marta")
    expect(etiquetaSede("bogota")).toBe("Bogotá")
  })
})

describe("parseCategoriaParam", () => {
  it("valor válido → categoría", () => {
    expect(parseCategoriaParam("cocina")).toBe("cocina")
    expect(parseCategoriaParam("closet")).toBe("closet")
  })

  it("vacío o desconocido → null (Todos)", () => {
    expect(parseCategoriaParam(null)).toBeNull()
    expect(parseCategoriaParam(undefined)).toBeNull()
    expect(parseCategoriaParam("")).toBeNull()
    expect(parseCategoriaParam("no-categoria")).toBeNull()
  })
})
