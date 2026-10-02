import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const h = vi.hoisted(() => ({
  rol: "admin" as "admin" | "disenador" | "editor",
  autenticado: true,
}))

// requireRol devuelve null cuando el rol pasa, o una respuesta 401/403.
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

import { GET, PUT } from "@/app/api/staff/diseno/visores-landing/route"
import {
  GET as getAnimaciones,
  POST as postAnimacion,
} from "@/app/api/staff/diseno/visores-landing/[slot]/animaciones/route"
import { getServiceSupabase } from "@/lib/supabase/server"

beforeEach(() => {
  h.rol = "admin"
  h.autenticado = true
  vi.mocked(getServiceSupabase).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function req(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" })
}

function jsonReq(url: string, body: unknown, method = "PUT"): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function params(slot = "primero") {
  return { params: Promise.resolve({ slot }) }
}

// Cliente de pruebas que responde por tabla, con encadenamiento
// estilo supabase-js (select/eq/order/upsert/insert/maybeSingle/single).
// visores_landing: order → visores, maybeSingle → visorDelSlot,
//                  single → upsert.
// visores_landing_animaciones: order → animaciones, single → insert.
function makeSupabase(config: {
  visores?: { data: unknown; error?: unknown }
  animaciones?: { data: unknown; error?: unknown }
  visorDelSlot?: { data: unknown; error?: unknown }
  upsert?: { data: unknown; error?: unknown }
  insert?: { data: unknown; error?: unknown }
} = {}) {
  const visoresLanding = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(config.visores ?? { data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue(
      config.visorDelSlot ?? { data: null, error: null },
    ),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(config.upsert ?? { data: null, error: null }),
  }
  const animacionesTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(
      config.animaciones ?? { data: null, error: null },
    ),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(config.insert ?? { data: null, error: null }),
  }
  const from = vi.fn((table: string) =>
    table === "visores_landing" ? visoresLanding : animacionesTable,
  )
  return { from }
}

describe("GET /api/staff/diseno/visores-landing", () => {
  it("devuelve visores con animaciones ordenadas por orden", async () => {
    const supabase = makeSupabase({
      visores: {
        data: [
          {
            slot: "segundo",
            orden: 1,
            animaciones: [{ orden: 3 }, { orden: 1 }, { orden: 2 }],
          },
        ],
      },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await GET(
      req("http://localhost/api/staff/diseno/visores-landing"),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visores).toHaveLength(1)
    expect(data.visores[0].animaciones.map((a: { orden: number }) => a.orden)).toEqual([
      1, 2, 3,
    ])
  })

  it("500 si la consulta falla", async () => {
    const supabase = makeSupabase({
      visores: { data: null, error: { message: "boom" } },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await GET(
      req("http://localhost/api/staff/diseno/visores-landing"),
    )
    expect(res.status).toBe(500)
  })

  it("sin backend → lista vacía (200)", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await GET(
      req("http://localhost/api/staff/diseno/visores-landing"),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visores).toEqual([])
  })

  it("401 sin sesión", async () => {
    h.autenticado = false
    const res = await GET(
      req("http://localhost/api/staff/diseno/visores-landing"),
    )
    expect(res.status).toBe(401)
  })

  it("editor no puede leer (403)", async () => {
    h.rol = "editor"
    const res = await GET(
      req("http://localhost/api/staff/diseno/visores-landing"),
    )
    expect(res.status).toBe(403)
  })
})

describe("PUT /api/staff/diseno/visores-landing", () => {
  it("403 para disenador (solo admin escribe)", async () => {
    h.rol = "disenador"
    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {}),
    )
    expect(res.status).toBe(403)
  })

  it("400 JSON inválido", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await PUT(
      new NextRequest("http://localhost/api/staff/diseno/visores-landing", {
        method: "PUT",
        body: "{no-json",
      }),
    )
    expect(res.status).toBe(400)
  })

  it("422 título vacío", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {
      slot: "primero",
      titulo: "",
      video_global_url: "https://h/v.mp4",
      frame_centro_ms: 1000,
    }),
    )
    expect(res.status).toBe(422)
  })

  it("422 slot fuera de catálogo", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {
      slot: "tercero",
      titulo: "X",
      video_global_url: "https://h/v.mp4",
      frame_centro_ms: 1000,
    }),
    )
    expect(res.status).toBe(422)
  })

  it("422 frame fuera de rango", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {
      slot: "primero",
      titulo: "X",
      video_global_url: "https://h/v.mp4",
      frame_centro_ms: 900_000,
    }),
    )
    expect(res.status).toBe(422)
  })

  it("upsert por slot con orden por defecto", async () => {
    const upsert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: { id: "v1" }, error: null })
    const from = vi.fn().mockReturnValue({ upsert, select, single })
    vi.mocked(getServiceSupabase).mockReturnValue({ from } as never)

    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {
      slot: "primero",
      titulo: "Cita virtual",
      video_global_url: "https://h/v.mp4",
      frame_centro_ms: 1500,
    }),
    )
    expect(res.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slot: "primero",
        titulo: "Cita virtual",
        orden: 0,
        activo: true,
        descripcion: null,
        eyebrow: null,
      }),
      { onConflict: "slot" },
    )
  })

  it("500 si la BD falla en el upsert", async () => {
    const upsert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "unique violation" },
    })
    const from = vi.fn().mockReturnValue({ upsert, select, single })
    vi.mocked(getServiceSupabase).mockReturnValue({ from } as never)

    const res = await PUT(
      jsonReq("http://localhost/api/staff/diseno/visores-landing", {
      slot: "primero",
      titulo: "Cita virtual",
      video_global_url: "https://h/v.mp4",
      frame_centro_ms: 1500,
    }),
    )
    expect(res.status).toBe(500)
  })
})

describe("GET /api/staff/diseno/visores-landing/[slot]/animaciones", () => {
  it("devuelve animaciones del slot", async () => {
    const supabase = makeSupabase({
      visorDelSlot: { data: { id: "v1" }, error: null },
      animaciones: { data: [{ orden: 1 }, { orden: 0 }], error: null },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await getAnimaciones(
      req("http://localhost/api/staff/diseno/visores-landing/primero/animaciones"),
      params("primero"),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.animaciones).toHaveLength(2)
  })

  it("400 slot inválido", async () => {
    const res = await getAnimaciones(
      req("http://localhost/api/staff/diseno/visores-landing/tercero/animaciones"),
      params("tercero"),
    )
    expect(res.status).toBe(400)
  })

  it("sin visor en el slot → lista vacía (200)", async () => {
    const supabase = makeSupabase({ visorDelSlot: { data: null, error: null } })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await getAnimaciones(
      req("http://localhost/api/staff/diseno/visores-landing/primero/animaciones"),
      params("primero"),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.animaciones).toEqual([])
  })
})

describe("POST /api/staff/diseno/visores-landing/[slot]/animaciones", () => {
  it("403 para disenador (solo admin escribe)", async () => {
    h.rol = "disenador"
    const res = await postAnimacion(
      jsonReq(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        {},
        "POST",
      ),
      params("primero"),
    )
    expect(res.status).toBe(403)
  })

  it("409 si el slot aún no tiene visor", async () => {
    const supabase = makeSupabase({ visorDelSlot: { data: null, error: null } })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await postAnimacion(
      jsonReq(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        { titulo: "Apertura", video_movimiento_url: "https://h/a.mp4" },
        "POST",
      ),
      params("primero"),
    )
    expect(res.status).toBe(409)
  })

  it("422 video de movimiento sin URL válida", async () => {
    const supabase = makeSupabase({
      visorDelSlot: { data: { id: "v1" }, error: null },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await postAnimacion(
      jsonReq(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        { titulo: "Apertura", video_movimiento_url: "no-url" },
        "POST",
      ),
      params("primero"),
    )
    expect(res.status).toBe(422)
  })

  it("400 JSON inválido", async () => {
    const supabase = makeSupabase({
      visorDelSlot: { data: { id: "v1" }, error: null },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await postAnimacion(
      new NextRequest(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        { method: "POST", body: "{no-json" },
      ),
      params("primero"),
    )
    expect(res.status).toBe(400)
  })

  it("201 crea la animación con el visor_id del slot", async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: { id: "a1", visor_id: "v1" },
      error: null,
    })
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: "v1" }, error: null })
    const from = vi.fn((table: string) =>
      table === "visores_landing"
        ? { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle }
        : { insert, select, single },
    )
    vi.mocked(getServiceSupabase).mockReturnValue({ from } as never)

    const res = await postAnimacion(
      jsonReq(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        {
          titulo: "Apertura de cajón",
          descripcion: "Movimiento suave",
          video_movimiento_url: "https://h/a.mp4",
          video_accion_url: "https://h/accion.mp4",
        },
        "POST",
      ),
      params("primero"),
    )
    expect(res.status).toBe(201)
    expect(insert).toHaveBeenCalledWith({
      visor_id: "v1",
      titulo: "Apertura de cajón",
      descripcion: "Movimiento suave",
      video_movimiento_url: "https://h/a.mp4",
      video_accion_url: "https://h/accion.mp4",
      orden: 0,
    })
  })

  it("500 si la BD falla en el insert", async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    })
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: "v1" }, error: null })
    const from = vi.fn((table: string) =>
      table === "visores_landing"
        ? { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle }
        : { insert, select, single },
    )
    vi.mocked(getServiceSupabase).mockReturnValue({ from } as never)

    const res = await postAnimacion(
      jsonReq(
        "http://localhost/api/staff/diseno/visores-landing/primero/animaciones",
        { titulo: "Apertura", video_movimiento_url: "https://h/a.mp4" },
        "POST",
      ),
      params("primero"),
    )
    expect(res.status).toBe(500)
  })
})
