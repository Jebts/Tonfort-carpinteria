import { getServiceSupabase } from "@/lib/supabase/server"
import type { Proyecto } from "@/lib/supabase/types"

// Lee los proyectos publicados (ordenados) para /proyectos.
// Degrada a [] si el backend no está configurado.
export async function getProyectosPublicados(): Promise<Proyecto[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("publicado", true)
    .order("orden", { ascending: true })
  if (error) return []
  return (data ?? []) as Proyecto[]
}
