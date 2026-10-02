import { describe, it, expect, vi, afterEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ensureVisoresVideoBucket,
  VISORES_VIDEO_BUCKET,
  validateVideoUpload,
  extractStoragePath,
  deleteVisoresVideo,
} from "@/lib/storage"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ensureVisoresVideoBucket", () => {
  it("llama createBucket con {public:true} e ignora error /already exists/i", async () => {
    const createBucket = vi.fn().mockResolvedValue({
      error: { message: "Bucket 'visores-video' already exists" },
    })
    const supabase = {
      storage: { createBucket },
    } as unknown as SupabaseClient

    await expect(ensureVisoresVideoBucket(supabase)).resolves.toBeUndefined()
    expect(createBucket).toHaveBeenCalledWith(VISORES_VIDEO_BUCKET, { public: true })
  })

  it("no propaga errores distintos de already exists (los loguea y continúa)", async () => {
    const createBucket = vi.fn().mockResolvedValue({
      error: { message: "permission denied" },
    })
    const warn = vi.spyOn(console, "error").mockImplementation(() => {})
    const supabase = { storage: { createBucket } } as unknown as SupabaseClient

    await expect(ensureVisoresVideoBucket(supabase)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("éxito cuando no hay error", async () => {
    const createBucket = vi.fn().mockResolvedValue({ error: null })
    const supabase = { storage: { createBucket } } as unknown as SupabaseClient
    await expect(ensureVisoresVideoBucket(supabase)).resolves.toBeUndefined()
    expect(createBucket).toHaveBeenCalledTimes(1)
  })
})

describe("validateVideoUpload", () => {
  it("rechaza archivo vacío (0 bytes)", () => {
    const file = new File([], "video.mp4", { type: "video/mp4" })
    const res = validateVideoUpload(file, 10 * 1024 * 1024, "test")
    expect(res.valid).toBe(false)
    if (!res.valid) {
      expect(res.status).toBe(422)
      expect(res.error).toContain("vacío")
    }
  })

  it("rechaza MIME type no permitido", () => {
    const file = new File(["contenido"], "test.txt", { type: "text/plain" })
    const res = validateVideoUpload(file, 10 * 1024 * 1024, "test")
    expect(res.valid).toBe(false)
    if (!res.valid) {
      expect(res.status).toBe(422)
    }
  })

  it("rechaza archivo que supera el tamaño máximo", () => {
    const bigData = new Uint8Array(15 * 1024 * 1024)
    const file = new File([bigData], "grande.mp4", { type: "video/mp4" })
    const res = validateVideoUpload(file, 10 * 1024 * 1024, "test")
    expect(res.valid).toBe(false)
    if (!res.valid) {
      expect(res.status).toBe(422)
      expect(res.error).toContain("límite")
    }
  })

  it("acepta MP4, WebM y MOV válidos", () => {
    const mp4 = new File(["video"], "test.mp4", { type: "video/mp4" })
    const webm = new File(["video"], "test.webm", { type: "video/webm" })
    const mov = new File(["video"], "test.mov", { type: "video/quicktime" })

    expect(validateVideoUpload(mp4, 10 * 1024 * 1024, "test").valid).toBe(true)
    expect(validateVideoUpload(webm, 10 * 1024 * 1024, "test").valid).toBe(true)
    expect(validateVideoUpload(mov, 10 * 1024 * 1024, "test").valid).toBe(true)
  })
})

describe("extractStoragePath", () => {
  it("extrae la ruta relativa dentro del bucket", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/visores-video/proyectos/clip-123.mp4"
    expect(extractStoragePath(url, "visores-video")).toBe("proyectos/clip-123.mp4")
  })

  it("retorna null para URLs que no contienen el bucket o son inválidas", () => {
    expect(extractStoragePath("https://example.com/other-path/file.mp4", "visores-video")).toBeNull()
    expect(extractStoragePath("not-a-valid-url", "visores-video")).toBeNull()
  })
})

describe("deleteVisoresVideo", () => {
  it("elimina el archivo llamando remove con el path", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({ remove }),
      },
    } as unknown as SupabaseClient

    const url = "https://example.supabase.co/storage/v1/object/public/visores-video/clip.mp4"
    const res = await deleteVisoresVideo(supabase, url)
    expect(res.ok).toBe(true)
    expect(remove).toHaveBeenCalledWith(["clip.mp4"])
  })
})
