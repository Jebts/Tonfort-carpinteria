import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const h = vi.hoisted(() => ({ auth: true }))
vi.mock("@/lib/staff-auth", () => ({
  requireStaff: () =>
    h.auth
      ? null
      : new NextResponse(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
}))
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO: "Backend no configurado",
}))

import { GET, POST } from "@/app/api/staff/citas/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { resetCachedTableName } from "@/lib/citas-service"
import { makeSupabase } from "./helpers/supabase"

function futureISO(days = 5): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/staff/citas", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )
}

beforeEach(() => {
  h.auth = true
  vi.mocked(getServiceSupabase).mockReset()
  resetCachedTableName()
})


// Mock de Supabase que guarda el payload del `insert`: la cola de resultados
// devuelve datos fijos y no permite comprobar QUÉ se escribió.
function makeSupabaseRegistro() {
  const inserts: Record<string, unknown>[] = []
  const desde = (tabla: string) => {
    const condiciones: ((f: Record<string, unknown>) => boolean)[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cadena: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "then") {
            return (onFulfilled?: (v: unknown) => unknown) => {
              const filas: Record<string, unknown>[] = []
              return Promise.resolve({ data: filas, error: null }).then(onFulfilled)
            }
          }
          if (prop === "insert") {
            return (payload: Record<string, unknown>) => {
              inserts.push({ ...payload })
              return cadena
            }
          }
          if (prop === "eq") {
            return (campo: string, valor: unknown) => {
              condiciones.push((f) => f[campo] === valor)
              return cadena
            }
          }
          return () => cadena
        },
      },
    )
    return cadena
  }
  return { supabase: { from: desde }, inserts }
}

describe("GET /api/staff/citas", () => {
  it("401 sin sesión", async () => {
    h.auth = false
    const res = await GET(new NextRequest("http://localhost/api/staff/citas"))
    expect(res.status).toBe(401)
  })

  it("slots [] y citas [] cuando el backend es null", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await GET(new NextRequest("http://localhost/api/staff/citas"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slots).toEqual([])
    expect(data.citas).toEqual([])
  })

  it("200 slots + citas", async () => {
    const f = futureISO(5)
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        citas: [
          { data: null, error: null },
          {
            data: [
              {
                id: "s1",
                fecha_hora: f,
                estado: "aceptada",
                movida: false,
                nombre_solicitante: "X",
                cliente_id: null,
              },
            ],
            error: null,
          },
          { data: [{ id: "s1", fecha_hora: f, estado: "aceptada" }], error: null },
        ],
      }) as never,
    )
    const res = await GET(new NextRequest("http://localhost/api/staff/citas"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.citas.length).toBe(1)
    expect(data.slots.some((s: { estado: string }) => s.estado === "aceptada")).toBe(true)
  })
})

describe("POST /api/staff/citas", () => {
  it("201 crea", async () => {
    const f = futureISO(5)
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        citas: [
          { data: null, error: null },
          { data: [], error: null },
          { data: { id: "c1" }, error: null },
        ],
      }) as never,
    )
    const res = await post({ fecha_hora: f })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.cita.id).toBe("c1")
  })

  it("422 slot ocupado (ya hay aceptada)", async () => {
    const f = futureISO(5)
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: [{ id: "x" }], error: null }] }) as never,
    )
    const res = await post({ fecha_hora: f })
    expect(res.status).toBe(422)
  })

  it("422 si se pide crear directamente como aceptada", async () => {
    const f = futureISO(5)
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        citas: [
          { data: null, error: null },
          { data: [], error: null },
          { data: { id: "c1" }, error: null },
        ],
      }) as never,
    )
    const res = await post({ fecha_hora: f, estado: "aceptada" })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toContain("en espera")
  })

  it("guarda la modalidad con la que validó el cupo", async () => {
    const { supabase, inserts } = makeSupabaseRegistro()
    vi.mocked(getServiceSupabase).mockReturnValue(supabase as never)

    const modalidadId = "11111111-1111-4111-8111-111111111111"
    const res = await post({
      nombre_solicitante: "Ana",
      fecha_hora: futureISO(),
      duracion_minutos: 90,
      modalidad_id: modalidadId,
    })
    expect(res.status).toBe(201)
    expect(inserts).toHaveLength(1)
    // Sin esto la cita quedaba con `modalidad_id = null` y nunca cerraba el
    // bloque para el flujo público de esa modalidad.
    expect(inserts[0].modalidad_id).toBe(modalidadId)
    expect(inserts[0].estado).toBe("en_espera")
  })
})
