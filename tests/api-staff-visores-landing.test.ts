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

import { GET, POST } from "@/app/api/staff/administracion/visores-landing/route"
import { PATCH, DELETE } from "@/app/api/staff/administracion/visores-landing/[id]/route"
import {
  GET as getAnimaciones,
  POST as postAnimacion,
} from "@/app/api/staff/administracion/visores-landing/[id]/animaciones/route"
import { getServiceSupabase } from "@/lib/supabase/server"

const BASE = "http://localhost/api/staff/administracion/visores-landing"
const ID_VALIDO = "11111111-2222-3333-4444-555555555555"

beforeEach(() => {
  h.rol = "admin"
  h.autenticado = true
  vi.mocked(getServiceSupabase).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function req(url: string, method = "GET"): NextRequest {
  return new NextRequest(url, { method })
}

function jsonReq(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function params(id = ID_VALIDO) {
  return { params: Promise.resolve({ id }) }
}

// Cliente de pruebas que responde por tabla, con el encadenamiento estilo
// supabase-js: los métodos intermedios devuelven la propia tabla (`mockReturnThis`)
// y los terminales (`order`, `single`, `maybeSingle`) resuelven.
interface RespuestasVisor {
  /** `select().order()` de la colección y del cálculo de `orden`. */
  orden?: unknown
  errorOrden?: unknown
  /** Lectura por `id`. */
  porId?: unknown
  errorPorId?: unknown
  /** `insert().select().single()`. */
  insert?: unknown
  errorInsert?: unknown
}

function tablaVisores(r: RespuestasVisor = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: r.orden ?? null, error: r.errorOrden ?? null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: r.insert ?? null, error: r.errorInsert ?? null }),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: r.porId ?? null, error: r.errorPorId ?? null }),
  }
}

function tablaAnimaciones(r: { orden?: unknown; insert?: unknown; error?: unknown } = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: r.orden ?? null, error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: r.insert ?? null, error: r.error ?? null }),
  }
}

function makeSupabase(
  visores: RespuestasVisor = {},
  animaciones: { orden?: unknown; insert?: unknown; error?: unknown } = {},
) {
  const tablaV = tablaVisores(visores)
  const tablaA = tablaAnimaciones(animaciones)
  const from = vi.fn((table: string) => (table === "visores_landing" ? tablaV : tablaA))
  return { from, tablaV, tablaA }
}

// Valor que devuelve `maybeSingle` al leer el visor por `id`.
const VISOR = { id: "v1" }

describe("GET /api/staff/administracion/visores-landing", () => {
  it("devuelve visores con animaciones ordenadas por orden", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        orden: [
          { slot: null, orden: 1, animaciones: [{ orden: 3 }, { orden: 1 }, { orden: 2 }] },
        ],
      }) as never,
    )

    const res = await GET(req(BASE))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visores).toHaveLength(1)
    expect(data.visores[0].animaciones.map((a: { orden: number }) => a.orden)).toEqual([1, 2, 3])
  })

  it("500 si la consulta falla", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ errorOrden: { message: "boom" } }) as never,
    )
    expect((await GET(req(BASE))).status).toBe(500)
  })

  it("sin backend \u2192 lista vac\u00eda (200)", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await GET(req(BASE))
    expect(res.status).toBe(200)
    expect((await res.json()).visores).toEqual([])
  })

  it("401 sin sesi\u00f3n", async () => {
    h.autenticado = false
    expect((await GET(req(BASE))).status).toBe(401)
  })

  it("403 para disenador: el editor de visores es de administraci\u00f3n", async () => {
    h.rol = "disenador"
    expect((await GET(req(BASE))).status).toBe(403)
  })
})

describe("POST /api/staff/administracion/visores-landing", () => {
  it("403 para disenador (solo admin escribe)", async () => {
    h.rol = "disenador"
    expect((await POST(jsonReq(BASE, {}))).status).toBe(403)
  })

  it("400 JSON inv\u00e1lido", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await POST(new NextRequest(BASE, { method: "POST", body: "{no-json" }))
    expect(res.status).toBe(400)
  })

  it("422 t\u00edtulo vac\u00edo", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await POST(
      jsonReq(BASE, { titulo: "", video_global_url: "https://h/v.mp4", frame_centro_ms: 1000 }),
    )
    expect(res.status).toBe(422)
  })

  it("201 crea el visor al final del carrusel con slot nulo", async () => {
    const supabase = makeSupabase({
      orden: [{ orden: 2 }],
      insert: { id: "v9" },
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(201)
    expect(supabase.tablaV.insert).toHaveBeenCalledWith(
      expect.objectContaining({ slot: null, titulo: "Cocina en L", orden: 3, activo: true }),
    )
  })

  it("500 si la BD falla al calcular el orden", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ errorOrden: { message: "boom" } }) as never,
    )
    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(500)
  })

  it("500 si la BD falla en el insert", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ orden: [{ orden: 0 }], errorInsert: { message: "boom" } }) as never,
    )
    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(500)
  })

  // La BD de producción puede seguir en el esquema anterior a la migración
  // 20260925000000_visores_carrusel.sql (`slot` NOT NULL + único + CHECK). El
  // fallo debe salir como 409 con la migración que hay que aplicar, no como un
  // 500 opaco.
  it("409 con la migración pendiente si «slot» sigue NOT NULL", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        orden: [{ orden: 0 }],
        errorInsert: {
          code: "23502",
          message: 'null value in column "slot" of relation "visores_landing" violates not-null constraint',
        },
      }) as never,
    )
    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(409)
    const data = (await res.json()) as { migracionPendiente?: string }
    expect(data.migracionPendiente).toBe("20260925000000_visores_carrusel.sql")
  })

  it("409 si el índice único antiguo de «slot» sigue puesto", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        orden: [{ orden: 0 }],
        errorInsert: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "visores_landing_slot_unq"',
        },
      }) as never,
    )
    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(409)
    const data = (await res.json()) as { migracionPendiente?: string }
    expect(data.migracionPendiente).toBe("20260925000000_visores_carrusel.sql")
  })

  it("409 si el CHECK antiguo de «slot» sigue puesto", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        orden: [{ orden: 0 }],
        errorInsert: {
          code: "23514",
          message: 'new row for relation "visores_landing" violates check constraint "visores_landing_slot_check"',
        },
      }) as never,
    )
    const res = await POST(
      jsonReq(BASE, {
        titulo: "Cocina en L",
        video_global_url: "https://h/v.mp4",
        frame_centro_ms: 1500,
      }),
    )
    expect(res.status).toBe(409)
    const data = (await res.json()) as { migracionPendiente?: string }
    expect(data.migracionPendiente).toBe("20260925000000_visores_carrusel.sql")
  })
})

describe("PATCH /api/staff/administracion/visores-landing/[id]", () => {
  it("400 con un id que no es UUID", async () => {
    const res = await PATCH(jsonReq(`${BASE}/nope`, { orden: 0 }, "PATCH"), params("nope"))
    expect(res.status).toBe(400)
  })

  it("404 si el visor no existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await PATCH(jsonReq(`${BASE}/${ID_VALIDO}`, { orden: 0 }, "PATCH"), params())
    expect(res.status).toBe(404)
  })

  it("PATCH de { orden } solo toca el orden", async () => {
    const supabase = makeSupabase({ porId: VISOR, insert: { id: "v1", orden: 3 } })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await PATCH(jsonReq(`${BASE}/${ID_VALIDO}`, { orden: 3 }, "PATCH"), params())
    expect(res.status).toBe(200)
    expect(supabase.tablaV.update).toHaveBeenCalledWith(expect.objectContaining({ orden: 3 }))
  })

  // Regresión: sin `.strict()`, `ordenSchema` descartaba el resto de claves y un
  // body completo entraba por el atajo de reordenado, perdiendo frame_centro_ms.
  it("un body completo con «orden» NO toma el atajo de reordenado", async () => {
    const supabase = makeSupabase({ porId: VISOR, insert: { id: "v1" } })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await PATCH(
      jsonReq(
        `${BASE}/${ID_VALIDO}`,
        {
          titulo: "Cocina",
          video_global_url: "https://h/v.mp4",
          frame_centro_ms: 3250,
          orden: 4,
        },
        "PATCH",
      ),
      params(),
    )

    expect(res.status).toBe(200)
    const payload = supabase.tablaV.update.mock.calls[0][0]
    expect(payload).toMatchObject({ titulo: "Cocina", frame_centro_ms: 3250, orden: 4 })
  })

  it("422 t\u00edtulo vac\u00edo", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({ porId: VISOR }) as never)
    const res = await PATCH(
      jsonReq(
        `${BASE}/${ID_VALIDO}`,
        { titulo: "", video_global_url: "https://h/v.mp4", frame_centro_ms: 0 },
        "PATCH",
      ),
      params(),
    )
    expect(res.status).toBe(422)
  })

  it("actualiza los campos del visor y conserva el orden si no viene", async () => {
    const supabase = makeSupabase({ porId: VISOR, insert: { id: "v1" } })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await PATCH(
      jsonReq(
        `${BASE}/${ID_VALIDO}`,
        { titulo: "Closet", video_global_url: "https://h/v.mp4", frame_centro_ms: 1500 },
        "PATCH",
      ),
      params(),
    )
    expect(res.status).toBe(200)
    const payload = supabase.tablaV.update.mock.calls[0][0]
    expect(payload).toMatchObject({ titulo: "Closet", activo: true })
    expect(payload).not.toHaveProperty("orden")
  })

  it("500 si la BD falla en el update", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ porId: VISOR, errorInsert: { message: "boom" } }) as never,
    )
    const res = await PATCH(jsonReq(`${BASE}/${ID_VALIDO}`, { orden: 1 }, "PATCH"), params())
    expect(res.status).toBe(500)
  })
})

describe("DELETE /api/staff/administracion/visores-landing/[id]", () => {
  it("400 con un id que no es UUID", async () => {
    expect((await DELETE(req(`${BASE}/nope`, "DELETE"), params("nope"))).status).toBe(400)
  })

  it("403 para disenador", async () => {
    h.rol = "disenador"
    expect((await DELETE(req(`${BASE}/${ID_VALIDO}`, "DELETE"), params())).status).toBe(403)
  })

  it("200 y borra la fila", async () => {
    const supabase = makeSupabase()
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)
    const res = await DELETE(req(`${BASE}/${ID_VALIDO}`, "DELETE"), params())
    expect(res.status).toBe(200)
    expect(supabase.tablaV.delete).toHaveBeenCalled()
  })

  it("500 si la BD falla al borrar", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue({
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
        }),
      }),
    } as never)
    const res = await DELETE(req(`${BASE}/${ID_VALIDO}`, "DELETE"), params())
    expect(res.status).toBe(500)
  })
})

describe("GET /api/staff/administracion/visores-landing/[id]/animaciones", () => {
  it("devuelve las animaciones del visor", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ porId: VISOR }, { orden: [{ orden: 1 }, { orden: 0 }] }) as never,
    )
    const res = await getAnimaciones(req(`${BASE}/${ID_VALIDO}/animaciones`), params())
    expect(res.status).toBe(200)
    expect((await res.json()).animaciones).toHaveLength(2)
  })

  it("400 con un id que no es UUID", async () => {
    expect((await getAnimaciones(req(`${BASE}/x/animaciones`), params("x"))).status).toBe(400)
  })

  it("sin visor \u2192 lista vac\u00eda (200)", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await getAnimaciones(req(`${BASE}/${ID_VALIDO}/animaciones`), params())
    expect(res.status).toBe(200)
    expect((await res.json()).animaciones).toEqual([])
  })
})

describe("POST /api/staff/administracion/visores-landing/[id]/animaciones", () => {
  it("403 para disenador (solo admin escribe)", async () => {
    h.rol = "disenador"
    const res = await postAnimacion(jsonReq(`${BASE}/${ID_VALIDO}/animaciones`, {}), params())
    expect(res.status).toBe(403)
  })

  it("404 si el visor no existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase() as never)
    const res = await postAnimacion(
      jsonReq(`${BASE}/${ID_VALIDO}/animaciones`, {
        titulo: "Apertura",
        video_movimiento_url: "https://h/a.mp4",
      }),
      params(),
    )
    expect(res.status).toBe(404)
  })

  it("422 video de movimiento sin URL v\u00e1lida", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({ porId: VISOR }) as never)
    const res = await postAnimacion(
      jsonReq(`${BASE}/${ID_VALIDO}/animaciones`, {
        titulo: "Apertura",
        video_movimiento_url: "no-url",
      }),
      params(),
    )
    expect(res.status).toBe(422)
  })

  it("400 JSON inv\u00e1lido", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({ porId: VISOR }) as never)
    const res = await postAnimacion(
      new NextRequest(`${BASE}/${ID_VALIDO}/animaciones`, { method: "POST", body: "{no-json" }),
      params(),
    )
    expect(res.status).toBe(400)
  })

  it("201 crea la animaci\u00f3n con el visor_id de la ruta", async () => {
    const supabase = makeSupabase(
      { porId: VISOR },
      { insert: { id: "a1", visor_id: "v1" } },
    )
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const res = await postAnimacion(
      jsonReq(`${BASE}/${ID_VALIDO}/animaciones`, {
        titulo: "Apertura de caj\u00f3n",
        descripcion: "Movimiento suave",
        video_movimiento_url: "https://h/a.mp4",
        video_accion_url: "https://h/accion.mp4",
      }),
      params(),
    )
    expect(res.status).toBe(201)
    expect(supabase.tablaA.insert).toHaveBeenCalledWith({
      visor_id: "v1",
      titulo: "Apertura de caj\u00f3n",
      descripcion: "Movimiento suave",
      video_movimiento_url: "https://h/a.mp4",
      video_accion_url: "https://h/accion.mp4",
      orden: 0,
    })
  })

  it("500 si la BD falla en el insert", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ porId: VISOR }, { error: { message: "boom" } }) as never,
    )
    const res = await postAnimacion(
      jsonReq(`${BASE}/${ID_VALIDO}/animaciones`, {
        titulo: "Apertura",
        video_movimiento_url: "https://h/a.mp4",
      }),
      params(),
    )
    expect(res.status).toBe(500)
  })
})
