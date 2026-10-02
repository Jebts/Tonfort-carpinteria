import {
  CATEGORIAS_MUEBLE,
  ETIQUETA_CATEGORIA,
  type CategoriaMueble,
} from "@/lib/supabase/types"

// Catálogo cerrado de categorías de mueble. La fuente única es
// `CATEGORIAS_MUEBLE` de `lib/supabase/types.ts` (espejo del enum
// `categoria_mueble` de la BD). Este módulo solo añade el copy de una línea
// que usa el filtro público y el type guard para validar query params.

export interface CategoriaMuebleInfo {
  value: CategoriaMueble
  label: string
  copy: string
}

export const CATEGORIAS: CategoriaMuebleInfo[] = [
  { value: "cocina", label: ETIQUETA_CATEGORIA.cocina, copy: "Módulos, mesones y almacenaje." },
  { value: "closet", label: ETIQUETA_CATEGORIA.closet, copy: "Vestidores con luz y orden." },
  { value: "mueble_tv", label: ETIQUETA_CATEGORIA.mueble_tv, copy: "Muros, racks y centros de medios." },
  { value: "puerta", label: ETIQUETA_CATEGORIA.puerta, copy: "Puertas, marcos y herrajes a medida." },
  { value: "iluminacion", label: ETIQUETA_CATEGORIA.iluminacion, copy: "Perfiles, rieles y luz integrada." },
  { value: "espacio_integral", label: ETIQUETA_CATEGORIA.espacio_integral, copy: "Un proyecto, todas las piezas." },
  { value: "otro", label: ETIQUETA_CATEGORIA.otro, copy: "Trabajos fuera de catálogo." },
]

const POR_VALUE: Record<CategoriaMueble, CategoriaMuebleInfo> = CATEGORIAS.reduce(
  (acc, categoria) => {
    acc[categoria.value] = categoria
    return acc
  },
  {} as Record<CategoriaMueble, CategoriaMuebleInfo>,
)

export function esCategoriaMueble(valor: string): valor is CategoriaMueble {
  return Object.prototype.hasOwnProperty.call(POR_VALUE, valor)
}

export function infoCategoria(valor: CategoriaMueble): CategoriaMuebleInfo {
  return POR_VALUE[valor]
}

export function labelCategoria(valor: CategoriaMueble | null): string | null {
  return valor ? ETIQUETA_CATEGORIA[valor] : null
}

// El catálogo de tipos debe seguir en sync con el de `CATEGORIAS`.
if (CATEGORIAS.length !== CATEGORIAS_MUEBLE.length) {
  throw new Error("lib/categorias.ts está desincronizado con CATEGORIAS_MUEBLE")
}