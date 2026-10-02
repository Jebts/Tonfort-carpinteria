import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()
const removeMock = vi.fn()

let videoUrlToReplace: string | null = null

const h = vi.hoisted(() => ({ auth: true }))
vi.mock("@/lib/diseno-access", () => ({
  getDisenoProjectAccess: () =>
    h.auth
      ? {
          ok: true as const,
          session: { usuario: "disenador@test.com", nombre: "D", rol: "disenador" as const },
          supabase: {
            from: (table: string) => {
              const handler = {
                select: () => handler,
                eq: () => handler,
                update: () => handler,
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: "p", producto_id: "prod", video_global_url: videoUrlToReplace },
                    error: null,
                  }),
                single: () =>
                  Promise.resolve({
                    data: { id: "p", video_global_url: "https://host/visores-video/global-1.mp4" },
                    error: null,
                  }),
              }
              return handler
            },
            storage: {
              createBucket: vi.fn().mockResolvedValue({ error: null }),
              from: () => ({
                upload: uploadMock,
                getPublicUrl: getPublicUrlMock,
                remove: removeMock,
              }),
            },
          },
        }
      : { ok: false as const, response: new NextResponse(JSON.stringify({ error: "Prohibido" }), { status: 403 }) },
}))

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
}))

import { POST, DELETE } from "@/app/api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/upload-global-video/route"

afterEach(() => {
  h.auth = true
  videoUrlToReplace = null
  vi.restoreAllMocks()
  uploadMock.mockReset()
  getPublicUrlMock.mockReset()
  removeMock.mockReset()
})

function makeRequest(file: File, extra: Record<string, string> = {}) {
  const fd = new FormData()
  fd.append("file", file)
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return POST(
    new NextRequest("http://localhost/api/staff/diseno/proyectos/p/prod/p/propuestos/p/upload-global-video", {
      method: "POST",
      body: fd,
    }),
    { params: Promise.resolve({ id: "p", productoId: "prod", propuestaId: "p" }) },
  )
}

function makeDelete(url: string) {
  return DELETE(
    new NextRequest(`http://localhost/api/staff/diseno/proyectos/p/prod/p/propuestos/p/upload-global-video?url=${encodeURIComponent(url)}`),
    { params: Promise.resolve({ id: "p", productoId: "prod", propuestaId: "p" }) },
  )
}

describe("POST /api/staff/diseno/.../upload-global-video", () => {
  it("rechaza archivo vacío (422)", async () => {
    const file = new File([], "video.mp4", { type: "video/mp4" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("rechaza formato no permitido (422)", async () => {
    const file = new File(["x"], "video.avi", { type: "video/x-msvideo" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("rechaza imagen (422)", async () => {
    const file = new File(["x"], "foto.png", { type: "image/png" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("rechaza video mayor a 100 MB (422)", async () => {
    const big = new Uint8Array(101 * 1024 * 1024)
    const file = new File([big], "video.mp4", { type: "video/mp4" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(422)
  })

  it("sube y devuelve URL para MP4 válido (200)", async () => {
    const file = new File(["contenido"], "global.mp4", { type: "video/mp4" })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://host/visores-video/global-1.mp4" } })

    const res = await makeRequest(file, { slug: "cocina", titulo: "Cocina" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBe("https://host/visores-video/global-1.mp4")
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })

  it("reemplaza video antiguo al recibir url de reemplazo", async () => {
    videoUrlToReplace = "https://host/visores-video/global-1.mp4"
    const file = new File(["contenido"], "global2.mp4", { type: "video/mp4" })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://host/visores-video/global-2.mp4" } })
    removeMock.mockResolvedValue({ error: null })

    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(200)
    expect(removeMock).toHaveBeenCalledTimes(1)
  })

  it("403 sin acceso al proyecto", async () => {
    h.auth = false
    const file = new File(["contenido"], "video.mp4", { type: "video/mp4" })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(403)
  })

  it("500 si storage falla", async () => {
    const file = new File(["contenido"], "video.mp4", { type: "video/mp4" })
    uploadMock.mockResolvedValue({ error: new Error("bucket not found") })
    const res = await makeRequest(file, { slug: "cocina" })
    expect(res.status).toBe(500)
  })
})

describe("DELETE /api/staff/diseno/.../upload-global-video", () => {
  it("elimina el objeto del bucket (200)", async () => {
    removeMock.mockResolvedValue({ error: null })
    const res = await makeDelete("https://host/visores-video/global-1.mp4")
    expect(res.status).toBe(200)
    expect(removeMock).toHaveBeenCalledTimes(1)
  })

  it("403 sin acceso al proyecto", async () => {
    h.auth = false
    const res = await makeDelete("https://host/visores-video/global-1.mp4")
    expect(res.status).toBe(403)
  })

  it("500 si storage falla al eliminar", async () => {
    removeMock.mockResolvedValue({ error: new Error("not found") })
    const res = await makeDelete("https://host/visores-video/global-1.mp4")
    expect(res.status).toBe(500)
  })

  it("400 sin url de video", async () => {
    h.auth = true
    const res = await DELETE(
      new NextRequest("http://localhost/api/staff/diseno/proyectos/p/prod/p/propuestos/p/upload-global-video"),
      { params: Promise.resolve({ id: "p", productoId: "prod", propuestaId: "p" }) },
    )
    expect(res.status).toBe(400)
  })
})
