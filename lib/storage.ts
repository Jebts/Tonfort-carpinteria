import type { SupabaseClient } from "@supabase/supabase-js"

// Nombre del bucket de Storage para videos e imágenes de portada de proyectos.
export const PROYECTOS_BUCKET = "proyectos"

// Asegura que el bucket 'proyectos' exista y sea público. Se llama antes de subir
// para no depender de que la migración 0004 se haya aplicado manualmente. Si el
// bucket ya existe, createBucket devuelve un error que ignoramos.
export async function ensureProyectosBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(PROYECTOS_BUCKET, {
    public: true,
  })
  if (error && !/already exists/i.test(error.message)) {
    console.error("[storage] no se pudo asegurar el bucket 'proyectos':", error.message)
  }
}
