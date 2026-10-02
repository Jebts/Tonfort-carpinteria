import { getServiceSupabase } from "@/lib/supabase/server"
import type {
  ProductoVersion,
  ProductoVersionModelo,
  ProductoVersionMaterial,
} from "@/lib/supabase/legacy-types"
import { sanitizeError } from "@/lib/errors"

// --- Producto versiones ---

export async function getProductoVersiones(proyectoId: string): Promise<ProductoVersion[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("producto_versiones")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: false })
  if (error) return []
  return (data ?? []) as ProductoVersion[]
}

export async function getProductoVersion(id: string): Promise<ProductoVersion | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("producto_versiones")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error || !data) return null
  return data as ProductoVersion
}

export async function crearProductoVersion(datos: Partial<ProductoVersion>): Promise<ProductoVersion | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("producto_versiones")
    .insert({
      proyecto_id: datos.proyecto_id ?? "",
      modelo_id: datos.modelo_id ?? "",
      nombre: datos.nombre ?? "Sin nombre",
      seleccion: datos.seleccion ?? {},
      snapshot_json: datos.snapshot_json ?? null,
      precio_final: datos.precio_final ?? null,
      tiempo_entrega: datos.tiempo_entrega ?? null,
      estado: datos.estado ?? "borrador",
    })
    .select()
    .single()
  if (error) return null
  return data as ProductoVersion
}

export async function actualizarProductoVersion(
  id: string,
  datos: Partial<ProductoVersion>,
): Promise<ProductoVersion | null> {
  const supabase = getServiceSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("producto_versiones")
    .update(datos)
    .eq("id", id)
    .select()
    .single()
  if (error) return null
  return data as ProductoVersion
}

export async function eliminarProductoVersion(id: string): Promise<boolean> {
  const supabase = getServiceSupabase()
  if (!supabase) return false
  const { error } = await supabase.from("producto_versiones").delete().eq("id", id)
  return !error
}

// --- Producto version modelos ---

export async function getProductoVersionModelos(versionId: string): Promise<ProductoVersionModelo[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("producto_version_modelos")
    .select("*")
    .eq("producto_version_id", versionId)
    .order("orden", { ascending: true })
  if (error) return []
  return (data ?? []) as ProductoVersionModelo[]
}

export async function setProductoVersionModelos(
  versionId: string,
  modeloIds: string[],
): Promise<boolean> {
  const supabase = getServiceSupabase()
  if (!supabase) return false

  const { error: delError } = await supabase
    .from("producto_version_modelos")
    .delete()
    .eq("producto_version_id", versionId)
  if (delError) return false

  if (modeloIds.length === 0) return true

  const filas = modeloIds.map((modeloId, idx) => ({
    producto_version_id: versionId,
    modelo_id: modeloId,
    orden: idx,
  }))

  const { error } = await supabase.from("producto_version_modelos").insert(filas)
  return !error
}

// --- Producto version materiales ---

export async function getProductoVersionMateriales(versionId: string): Promise<ProductoVersionMaterial[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("producto_version_materiales")
    .select("*")
    .eq("producto_version_id", versionId)
    .order("tipo_material", { ascending: true })
    .order("nombre_material", { ascending: true })
  if (error) return []
  return (data ?? []) as ProductoVersionMaterial[]
}

export async function upsertProductoVersionMateriales(
  versionId: string,
  materiales: Omit<ProductoVersionMaterial, "id" | "producto_version_id" | "created_at">[],
): Promise<ProductoVersionMaterial[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []

  const existentes = await getProductoVersionMateriales(versionId)
  const existentesMap = new Map(existentes.map((m) => [`${m.tipo_material}|${m.nombre_material}`, m]))

  const toInsert: Omit<ProductoVersionMaterial, "id" | "created_at">[] = []
  const toUpdate: { id: string; datos: Partial<ProductoVersionMaterial> }[] = []

  for (const mat of materiales) {
    const clave = `${mat.tipo_material}|${mat.nombre_material}`
    const existente = existentesMap.get(clave)
    if (existente) {
      toUpdate.push({ id: existente.id, datos: mat })
    } else {
      toInsert.push({ ...mat, producto_version_id: versionId })
    }
  }

  for (const item of toInsert) {
    const { error } = await supabase.from("producto_version_materiales").insert(item)
    if (error) console.error("[productos-service] error insertando material:", sanitizeError(error))
  }

  for (const item of toUpdate) {
    const { error } = await supabase
      .from("producto_version_materiales")
      .update(item.datos)
      .eq("id", item.id)
    if (error) console.error("[productos-service] error actualizando material:", sanitizeError(error))
  }

  return getProductoVersionMateriales(versionId)
}
