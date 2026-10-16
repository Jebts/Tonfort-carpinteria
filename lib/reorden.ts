import type { SupabaseClient } from "@supabase/supabase-js"

// Tablas sobre las que la UI puede reordenar por `orden`. El nombre viaja al
// RPC, así que solo se aceptan estos valores (nunca input arbitrario).
export type TablaReordenable = "proyectos" | "proyectos_fotos" | "proyectos_visores"

// Columna con la que se acota el reorden dentro de un proyecto (defensa extra:
// los endpoints ya validan pertenencia antes de llegar aquí).
export interface ScopeReorden {
  columna: string
  valor: string
}

export type ResultadoReorden =
  | { ok: true; actualizadas: number }
  | { ok: false; error: string }

// PostgREST avisa así cuando la función todavía no existe en la base
// (migración `20261012000000_proyectos_visores.sql` sin aplicar).
function esRpcAusente(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST202" ||
    /could not find the function/i.test(error.message ?? "") ||
    /404/.test(error.message ?? "")
  )
}

/**
 * Aplica un nuevo orden completo. La posición de cada id en `ids` es su nuevo
 * `orden`.
 *
 * Vía preferente: el RPC `tonfort_reordenar_por_ids`, que escribe toda la lista
 * en una sola transacción. Si esa función aún no existe en la base (migración
 * pendiente), se degrada a un UPDATE por fila —no es atómico, pero el
 * reordenamiento sigue operativo— y se deja aviso en consola.
 */
export async function aplicarReorden(
  supabase: SupabaseClient,
  tabla: TablaReordenable,
  ids: string[],
  scope?: ScopeReorden,
): Promise<ResultadoReorden> {
  if (ids.length === 0) {
    return { ok: true, actualizadas: 0 }
  }

  const { error } = await supabase.rpc("tonfort_reordenar_por_ids", {
    tabla,
    ids,
  })

  if (!error) {
    return { ok: true, actualizadas: ids.length }
  }

  if (!esRpcAusente(error)) {
    console.error(`[reordenar ${tabla}]`, error.message ?? error)
    return { ok: false, error: error.message ?? "Error al reordenar" }
  }

  console.warn(
    `[reordenar ${tabla}] RPC tonfort_reordenar_por_ids ausente: aplica la migración 20261012000000 para hacerlo transaccional. Se usa UPDATE por fila.`,
  )

  const construir = (id: string, orden: number) => {
    let query = supabase.from(tabla).update({ orden }).eq("id", id)
    if (scope) {
      query = query.eq(scope.columna, scope.valor)
    }
    return query
  }

  const resultados = await Promise.all(ids.map((id, index) => construir(id, index)))
  const errores = resultados.filter((r) => r.error)

  if (errores.length > 0) {
    console.error(`[reordenar ${tabla}] fallback`, errores[0].error?.message ?? errores[0].error)
    return { ok: false, error: "Error al reordenar" }
  }

  return { ok: true, actualizadas: ids.length }
}
