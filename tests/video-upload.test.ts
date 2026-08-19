import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()

vi.mock("@/lib/staff-auth", () => ({
  requireStaff: () => null,
}))

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => ({
    storage: {
      createBucket: vi.fn().mockResolvedValue({ error: null }),
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}))

import { POST } from "@/app/api/staff/proyectos/upload-video/route"

afterEach(() => {
  vi.restoreAllMocks()
  uploadMock.mockReset()
  getPublicUrlMock.mockReset()
})

function makeRequest(file: File, extra: Record<string, string> = {}) {
  const fd = new FormData()
  fd.append("file", file)
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return POST(
    new NextRequest("http://localhost/api/staff/proyectos/upload-video", {
      method: "POST",
      body: fd,
    }),
  )
}

describe("POST /api/staff/proyectos/upload-video", () => {
  it("rechaza archivos que no son video (422)", async () => {
    const file = new File(["x"], "foto.png", { type: "image/png" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("rechaza videos mayores a 100 MB (422)", async () => {
    const big = new Uint8Array(105 * 1024 * 1024)
    const file = new File([big], "video.mp4", { type: "video/mp4" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("sube y devuelve la URL pública para un video válido (200)", async () => {
    const file = new File(["contenido"], "video.mp4", { type: "video/mp4" })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://host/storage/v/proyectos/cocina-1.mp4" } })

    const res = await makeRequest(file, { slug: "cocina", titulo: "Cocina" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBe("https://host/storage/v/proyectos/cocina-1.mp4")
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })

  it("propaga el error del storage (500)", async () => {
    const file = new File(["contenido"], "video.mp4", { type: "video/mp4" })
    uploadMock.mockResolvedValue({ error: new Error("bucket not found") })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(500)
  })
})
