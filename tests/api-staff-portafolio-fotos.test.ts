import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const h = vi.hoisted(() => ({
  rol: "admin" as "admin" | "disenador" | "editor",
  autenticado: true,
}))

vi.mock("@/lib/staff-auth", () => ({
  requireRol: (_req: NextRequest, roles: string[]) => {
    if (!h.autenticado) {
      return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }
    if (!roles.includes(h.rol)) {
      return new NextResponse(JSON.stringify({ error: "Prohibido" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      })
    }
    return null
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
}))

import {
  GET as getFotos,
  POST as postFoto,
} from "@/app/api/staff/administracion/portafolio/proyectos/[id]/fotos/route"
import { DELETE as deleteFoto } from "@/app/api/staff/administracion/portafolio/proyectos/[id]/fotos/[fotoId]/route"
import { PATCH as patchProyecto } from "@/app/api/staff/administracion/portafolio/proyectos/[id]/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { IMAGEN_MAX_SIZE } from "@/lib/storage"

const PROYECTO_ID = "11111111-1111-1111-1111-111111111111"
const FOTO_ID = "22222222-2222-2222-2222-222222222222"
const URL_PUBLICA = "https://host.supabase.co/storage/v1/object/public/portafolio-imagenes/p/a.jpg"
const RUTA_OBJETO = ["p/a.jpg"]

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()
const removeMock = vi.fn()
const createBucketMock = vi.fn()

type Respuesta = { data: unknown; error: unknown }

const resOk = (data: unknown): Respuesta => ({ data, error: null })
const resError = (message: string): Respuesta => ({ data: null, error: { message } })

type Terminales = { data: unknown; error: unknown }
type Opciones = { await?: Terminales; single?: Terminales; maybeSingle?: Terminales }

type Tabla = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (onFulfilled: (valor: Terminales) => unknown) => Promise<unknown>
}

// Objeto encadenado estilo supabase-js. Es a la vez "tabla" y promesa: cada
// terminal (await directo, .single(), .maybeSingle()) tiene su propia respuesta.
function makeTabla({ await: alAwait, single, maybeSingle }: Opciones = {}): Tabla {
  const t = {} as Tabla
  t.select = vi.fn(() => t)
  t.insert = vi.fn(() => t)
  t.update = vi.fn(() => t)
  t.delete = vi.fn(() => t)
  t.eq = vi.fn(() => t)
  t.order = vi.fn(() => t)
  t.limit = vi.fn(() => t)
  t.single = vi.fn(() => Promise.resolve(single ?? resOk(null)))
  t.maybeSingle = vi.fn(() => Promise.resolve(maybeSingle ?? resOk(null)))
  t.then = (onFulfilled) => Promise.resolve(alAwait ?? resOk(null)).then(onFulfilled)
  return t
}

function makeSupabase(config: { proyectos?: Opciones; fotos?: Opciones } = {}) {
  const proyectos = makeTabla(config.proyectos)
  const fotos = makeTabla(config.fotos)
  const tablas: Record<string, Tabla> = { proyectos, proyectos_fotos: fotos }
  const supabase = {
    from: (table: string) => {
      const t = tablas[table]
      if (!t) throw new Error(`tabla inesperada: ${table}`)
      return t
    },
    storage: {
      createBucket: createBucketMock,
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
        remove: removeMock,
      }),
    },
  }
  return { supabase, tablas }
}

function usar(config: { proyectos?: Opciones; fotos?: Opciones } = {}) {
  const hecho = makeSupabase(config)
  vi.mocked(getServiceSupabase).mockReturnValue(hecho.supabase as never)
  return hecho.tablas
}

function postReq(file: File | null, extra: Record<string, string> = {}) {
  const fd = new FormData()
  if (file) fd.append("file", file)
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return new NextRequest("http://localhost/api/x", { method: "POST", body: fd })
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function deleteReq() {
  return new NextRequest("http://localhost/api/x", { method: "DELETE" })
}

function getReq() {
  return new NextRequest("http://localhost/api/x")
}

const soloProyecto = { params: Promise.resolve({ id: PROYECTO_ID }) }
const fotoParams = { params: Promise.resolve({ id: PROYECTO_ID, fotoId: FOTO_ID }) }

function jpeg(nombre: string) {
  return new File(["contenido"], nombre, { type: "image/jpeg" })
}

beforeEach(() => {
  h.rol = "admin"
  h.autenticado = true
  vi.mocked(getServiceSupabase).mockReset()
  uploadMock.mockReset()
  getPublicUrlMock.mockReset()
  removeMock.mockReset()
  createBucketMock.mockReset().mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /api/staff/administracion/portafolio/proyectos/[id]/fotos", () => {
  it("403 sin rol admin", async () => {
    h.rol = "disenador"
    usar()
    const res = await postFoto(postReq(jpeg("a.jpg")), soloProyecto)
    expect(res.status).toBe(403)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("422 si no llega archivo", async () => {
    usar()
    const res = await postFoto(postReq(null), soloProyecto)
    expect(res.status).toBe(422)
  })

  it("422 con archivo vacío", async () => {
    usar()
    const file = new File([], "vacia.jpg", { type: "image/jpeg" })
    const res = await postFoto(postReq(file), soloProyecto)
    expect(res.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("422 con MIME no válido", async () => {
    usar()
    const file = new File(["x"], "documento.pdf", { type: "application/pdf" })
    const res = await postFoto(postReq(file), soloProyecto)
    expect(res.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("422 con extensión no válida", async () => {
    usar()
    const file = new File(["x"], "imagen.exe", { type: "image/jpeg" })
    const res = await postFoto(postReq(file), soloProyecto)
    expect(res.status).toBe(422)
  })

  it("422 por encima de IMAGEN_MAX_SIZE", async () => {
    usar()
    const grande = new Uint8Array(IMAGEN_MAX_SIZE + 1024)
    const file = new File([grande], "grande.jpg", { type: "image/jpeg" })
    const res = await postFoto(postReq(file), soloProyecto)
    expect(res.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("404 si el proyecto no existe", async () => {
    usar({ proyectos: { maybeSingle: resOk(null) } })
    const res = await postFoto(postReq(jpeg("a.jpg")), soloProyecto)
    expect(res.status).toBe(404)
  })

  it("201 sube la foto y la devuelve con orden = max(orden) + 1", async () => {
    const tablas = usar({
      proyectos: { maybeSingle: resOk({ id: PROYECTO_ID }) },
      fotos: {
        maybeSingle: resOk({ orden: 4 }),
        single: resOk({
          id: FOTO_ID,
          proyecto_id: PROYECTO_ID,
          url: URL_PUBLICA,
          alt: "Cocina terminada",
          orden: 5,
        }),
      },
    })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: URL_PUBLICA } })

    const res = await postFoto(postReq(jpeg("cocina.jpg"), { alt: "Cocina terminada" }), soloProyecto)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.foto.orden).toBe(5)
    expect(data.foto.url).toBe(URL_PUBLICA)
    expect(createBucketMock).toHaveBeenCalledWith("portafolio-imagenes", { public: true })
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(tablas.proyectos_fotos.insert).toHaveBeenCalledWith(
      expect.objectContaining({ proyecto_id: PROYECTO_ID, url: URL_PUBLICA, orden: 5 }),
    )
  })

  it("201 con orden 1 cuando el proyecto no tiene fotos", async () => {
    const tablas = usar({
      proyectos: { maybeSingle: resOk({ id: PROYECTO_ID }) },
      fotos: { maybeSingle: resOk(null), single: resOk({ id: FOTO_ID, orden: 1 }) },
    })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: URL_PUBLICA } })

    const res = await postFoto(postReq(jpeg("primera.jpg")), soloProyecto)
    expect(res.status).toBe(201)
    expect(tablas.proyectos_fotos.insert).toHaveBeenCalledWith(
      expect.objectContaining({ orden: 1 }),
    )
  })

  it("500 si storage falla al subir", async () => {
    usar({
      proyectos: { maybeSingle: resOk({ id: PROYECTO_ID }) },
      fotos: { maybeSingle: resOk({ orden: 2 }) },
    })
    uploadMock.mockResolvedValue({ error: "bucket not found" })

    const res = await postFoto(postReq(jpeg("a.jpg")), soloProyecto)
    expect(res.status).toBe(500)
  })

  it("500 si la BD falla al insertar y limpia el storage", async () => {
    usar({
      proyectos: { maybeSingle: resOk({ id: PROYECTO_ID }) },
      fotos: { maybeSingle: resOk({ orden: 0 }), single: resError("boom") },
    })
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: URL_PUBLICA } })
    removeMock.mockResolvedValue({ error: null })

    const res = await postFoto(postReq(jpeg("a.jpg")), soloProyecto)
    expect(res.status).toBe(500)
    expect(removeMock).toHaveBeenCalledWith(RUTA_OBJETO)
  })

  it("500 si el backend no está configurado", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await postFoto(postReq(jpeg("a.jpg")), soloProyecto)
    expect(res.status).toBe(500)
  })
})

describe("GET /api/staff/administracion/portafolio/proyectos/[id]/fotos", () => {
  it("lista las fotos ordenadas por orden", async () => {
    const tablas = usar({
      fotos: {
        await: resOk([
          { id: "a", orden: 0, url: URL_PUBLICA },
          { id: "b", orden: 1, url: URL_PUBLICA },
        ]),
      },
    })

    const res = await getFotos(getReq(), soloProyecto)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.fotos.map((f: { orden: number }) => f.orden)).toEqual([0, 1])
    expect(tablas.proyectos_fotos.order).toHaveBeenCalledWith("orden", { ascending: true })
    expect(tablas.proyectos_fotos.eq).toHaveBeenCalledWith("proyecto_id", PROYECTO_ID)
  })

  it("500 si la consulta falla", async () => {
    usar({ fotos: { await: resError("boom") } })
    const res = await getFotos(getReq(), soloProyecto)
    expect(res.status).toBe(500)
  })

  it("sin backend devuelve lista vacía", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await getFotos(getReq(), soloProyecto)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.fotos).toEqual([])
  })

  it("403 sin rol admin", async () => {
    h.rol = "editor"
    const res = await getFotos(getReq(), soloProyecto)
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/staff/administracion/portafolio/proyectos/[id]/fotos/[fotoId]", () => {
  it("200 borra la fila y el objeto del bucket", async () => {
    const tablas = usar({
      fotos: { maybeSingle: resOk({ id: FOTO_ID, url: URL_PUBLICA }), await: resOk(null) },
      proyectos: { maybeSingle: resOk({ portada_url: null }) },
    })
    removeMock.mockResolvedValue({ error: null })

    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(tablas.proyectos_fotos.delete).toHaveBeenCalled()
    expect(removeMock).toHaveBeenCalledWith(RUTA_OBJETO)
    expect(tablas.proyectos.update).not.toHaveBeenCalled()
  })

  it("limpia portada_url si la foto borrada era la portada", async () => {
    const tablas = usar({
      fotos: { maybeSingle: resOk({ id: FOTO_ID, url: URL_PUBLICA }), await: resOk(null) },
      proyectos: { maybeSingle: resOk({ portada_url: URL_PUBLICA }) },
    })
    removeMock.mockResolvedValue({ error: null })

    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(200)
    expect(tablas.proyectos.update).toHaveBeenCalledWith({ portada_url: null })
  })

  it("no toca portada_url si la foto no era la portada", async () => {
    const tablas = usar({
      fotos: { maybeSingle: resOk({ id: FOTO_ID, url: URL_PUBLICA }), await: resOk(null) },
      proyectos: { maybeSingle: resOk({ portada_url: "https://host/otra.jpg" }) },
    })
    removeMock.mockResolvedValue({ error: null })

    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(200)
    expect(tablas.proyectos.update).not.toHaveBeenCalled()
  })

  it("404 si la foto no existe", async () => {
    usar({ fotos: { maybeSingle: resOk(null) } })
    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(404)
  })

  it("500 si la BD falla al borrar la fila", async () => {
    usar({
      fotos: { maybeSingle: resOk({ id: FOTO_ID, url: URL_PUBLICA }), await: resError("boom") },
    })
    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(500)
  })

  it("403 sin rol admin", async () => {
    h.rol = "disenador"
    const res = await deleteFoto(deleteReq(), fotoParams)
    expect(res.status).toBe(403)
    expect(removeMock).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/staff/administracion/portafolio/proyectos/[id] (campos nuevos)", () => {
  it("persiste una sede válida", async () => {
    const tablas = usar({ proyectos: { single: resOk({ id: PROYECTO_ID, sede: "bogota" }) } })

    const res = await patchProyecto(patchReq({ sede: "bogota" }), soloProyecto)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.proyecto.sede).toBe("bogota")
    expect(tablas.proyectos.update).toHaveBeenCalledWith({ sede: "bogota" })
  })

  it("422 con sede fuera de catálogo", async () => {
    const tablas = usar({ proyectos: { single: resOk({ id: PROYECTO_ID }) } })
    const res = await patchProyecto(patchReq({ sede: "medellin" }), soloProyecto)
    expect(res.status).toBe(422)
    expect(tablas.proyectos.update).not.toHaveBeenCalled()
  })

  it("persiste categoría del catálogo y null", async () => {
    const tablas = usar({ proyectos: { single: resOk({ id: PROYECTO_ID }) } })

    const ok = await patchProyecto(patchReq({ categoria: "cocina" }), soloProyecto)
    expect(ok.status).toBe(200)
    expect(tablas.proyectos.update).toHaveBeenCalledWith({ categoria: "cocina" })

    const sinCategoria = await patchProyecto(patchReq({ categoria: null }), soloProyecto)
    expect(sinCategoria.status).toBe(200)
    expect(tablas.proyectos.update).toHaveBeenCalledWith({ categoria: null })
  })

  it("422 con categoría fuera de catálogo", async () => {
    const tablas = usar({ proyectos: { single: resOk({ id: PROYECTO_ID }) } })
    const res = await patchProyecto(patchReq({ categoria: "barco" }), soloProyecto)
    expect(res.status).toBe(422)
    expect(tablas.proyectos.update).not.toHaveBeenCalled()
  })

  it("acepta portada_url válida y null, rechaza una no-URL", async () => {
    usar({ proyectos: { single: resOk({ id: PROYECTO_ID }) } })

    const ok = await patchProyecto(patchReq({ portada_url: URL_PUBLICA }), soloProyecto)
    expect(ok.status).toBe(200)

    const nula = await patchProyecto(patchReq({ portada_url: null }), soloProyecto)
    expect(nula.status).toBe(200)

    const mala = await patchProyecto(patchReq({ portada_url: "no-es-una-url" }), soloProyecto)
    expect(mala.status).toBe(422)
  })

  it("sigue aceptando los campos previos junto a los nuevos", async () => {
    const tablas = usar({ proyectos: { single: resOk({ id: PROYECTO_ID }) } })
    const res = await patchProyecto(
      patchReq({
        id: PROYECTO_ID,
        titulo: "Cocina Prado",
        descripcion: null,
        orden: 2,
        publicado: true,
        sede: "santa_marta",
        categoria: "cocina",
        portada_url: null,
      }),
      soloProyecto,
    )
    expect(res.status).toBe(200)
    expect(tablas.proyectos.update).toHaveBeenCalledWith({
      titulo: "Cocina Prado",
      descripcion: null,
      orden: 2,
      publicado: true,
      sede: "santa_marta",
      categoria: "cocina",
      portada_url: null,
    })
  })

  it("403 sin rol admin", async () => {
    h.rol = "disenador"
    const res = await patchProyecto(patchReq({ sede: "bogota" }), soloProyecto)
    expect(res.status).toBe(403)
  })
})
