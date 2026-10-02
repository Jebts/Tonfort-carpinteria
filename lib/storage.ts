import type { SupabaseClient } from "@supabase/supabase-js"

// Nombre del bucket de Storage para videos de los visores (Global, Movimiento, Acción).
export const VISORES_VIDEO_BUCKET = "visores-video"

// Límites de tamaño por tipo de clip (bytes).
export const VIDEO_MAX_SIZE_GLOBAL = 100 * 1024 * 1024
export const VIDEO_MAX_SIZE_CLIP = 50 * 1024 * 1024

// Tipos de video permitidos
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

export async function ensureVisoresVideoBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(VISORES_VIDEO_BUCKET, {
    public: true,
  })
  if (error && /already exists/i.test(error.message)) {
    if (typeof supabase.storage?.updateBucket === "function") {
      await supabase.storage.updateBucket(VISORES_VIDEO_BUCKET, { public: true }).catch(() => {})
    }
  } else if (error) {
    console.error("[storage] no se pudo asegurar el bucket 'visores-video':", error.message)
  }
}

// Valida un archivo de video: tipo MIME, extensión y tamaño.
export function validateVideoUpload(
  file: File,
  maxBytes: number,
  context: string,
): { valid: true } | { valid: false; error: string; status: number } {
  if (file.size === 0) {
    return { valid: false, error: "El archivo de video está vacío", status: 422 }
  }
  if (!VIDEO_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: "El archivo debe ser video (MP4, WebM o MOV)", status: 422 }
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const validExts = ["mp4", "webm", "mov"]
  if (!validExts.includes(ext)) {
    return { valid: false, error: `El archivo debe tener extensión ${validExts.join(", ")}`, status: 422 }
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return {
      valid: false,
      error: `El video supera el límite de ${mb} MB`,
      status: 422,
    }
  }
  return { valid: true }
}

// Extrae la ruta del objeto dentro del bucket desde una URL pública de storage.
export function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split("/")
    const idx = parts.findIndex((p) => p === bucket)
    if (idx === -1 || idx + 1 >= parts.length) return null
    return parts.slice(idx + 1).join("/")
  } catch {
    return null
  }
}

// Elimina un video del bucket visores-video si existe.
export async function deleteVisoresVideo(
  supabase: SupabaseClient,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const path = extractStoragePath(url, VISORES_VIDEO_BUCKET)
  if (!path) {
    console.warn("[visores-video DELETE] URL no pertenece a bucket local o es nula, omitiendo borrado de storage:", url)
    return { ok: true }
  }
  const { error } = await supabase.storage.from(VISORES_VIDEO_BUCKET).remove([path])
  if (error) {
    console.warn("[visores-video DELETE] advertencia de storage:", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// Sube un video al bucket visores-video bajo una ruta dada.
export async function uploadVisoresVideo(
  supabase: SupabaseClient,
  file: File,
  path: string,
): Promise<{ url: string; error?: string }> {
  const { error } = await supabase.storage.from(VISORES_VIDEO_BUCKET).upload(path, file, {
    upsert: true,
  })
  if (error) {
    console.error("[visores-video UPLOAD] error de storage:", error.message)
    return { url: "", error: error.message }
  }
  const { data } = supabase.storage.from(VISORES_VIDEO_BUCKET).getPublicUrl(path)
  return { url: data?.publicUrl ?? "" }
}

// Genera una ruta única para un video en el bucket.
export function generateVideoPath(folder: string, filename: string): string {
  return generateStoragePath(folder, filename)
}

// Genera una ruta única dentro de un bucket a partir de una carpeta y un nombre.
export function generateStoragePath(folder: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "mp4"
  const name = `${crypto.randomUUID()}.${ext}`
  return `${folder}/${name}`
}

// ==========================================
// Bucket portafolio-imagenes (fotos de proyectos)
// ==========================================

export const PORTAFOLIO_IMAGENES_BUCKET = "portafolio-imagenes"

export const IMAGEN_MAX_SIZE = 12 * 1024 * 1024

export const IMAGEN_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"]

export async function ensurePortafolioImagenesBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(PORTAFOLIO_IMAGENES_BUCKET, {
    public: true,
  })
  if (error && /already exists/i.test(error.message)) {
    if (typeof supabase.storage?.updateBucket === "function") {
      await supabase.storage
        .updateBucket(PORTAFOLIO_IMAGENES_BUCKET, { public: true })
        .catch(() => {})
    }
  } else if (error) {
    console.error("[storage] no se pudo asegurar el bucket 'portafolio-imagenes':", error.message)
  }
}

// Valida un archivo de imagen: tipo MIME, extensión y tamaño.
export function validateImageUpload(file: File): { valid: true } | { valid: false; error: string } {
  if (file.size === 0) {
    return { valid: false, error: "El archivo de imagen está vacío" }
  }
  if (!IMAGEN_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: "El archivo debe ser imagen (JPG, PNG, WebP o AVIF)" }
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const validExts = ["jpg", "jpeg", "png", "webp", "avif"]
  if (!validExts.includes(ext)) {
    return { valid: false, error: `El archivo debe tener extensión ${validExts.join(", ")}` }
  }
  if (file.size > IMAGEN_MAX_SIZE) {
    const mb = Math.round(IMAGEN_MAX_SIZE / (1024 * 1024))
    return { valid: false, error: `La imagen supera el límite de ${mb} MB` }
  }
  return { valid: true }
}

// Sube una imagen al bucket portafolio-imagenes bajo la carpeta del proyecto.
export async function uploadPortafolioImagen(
  supabase: SupabaseClient,
  file: File,
  proyectoId: string,
): Promise<{ url: string; error?: string }> {
  const path = generateStoragePath(proyectoId, file.name)
  const { error } = await supabase.storage
    .from(PORTAFOLIO_IMAGENES_BUCKET)
    .upload(path, file, { upsert: true })
  if (error) {
    console.error("[portafolio-imagenes UPLOAD] error de storage:", error.message)
    return { url: "", error: error.message }
  }
  const { data } = supabase.storage.from(PORTAFOLIO_IMAGENES_BUCKET).getPublicUrl(path)
  return { url: data?.publicUrl ?? "" }
}

// Elimina una imagen del bucket portafolio-imagenes si existe.
export async function deletePortafolioImagen(
  supabase: SupabaseClient,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const path = extractStoragePath(url, PORTAFOLIO_IMAGENES_BUCKET)
  if (!path) {
    console.warn(
      "[portafolio-imagenes DELETE] URL no pertenece al bucket local, omitiendo borrado:",
      url,
    )
    return { ok: true }
  }
  const { error } = await supabase.storage.from(PORTAFOLIO_IMAGENES_BUCKET).remove([path])
  if (error) {
    console.warn("[portafolio-imagenes DELETE] error de storage:", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
