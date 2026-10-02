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

import { PATCH, PUT, DELETE } from "@/app/api/staff/citas/[id]/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { resetCachedTableName } from "@/lib/citas-service"
import { makeSupabase } from "./helpers/supabase"

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const f = () => new Date(Date.now() + 5 * 86_400_000).toISOString()

function patch(id: string, body: unknown, queue?: Record<string, never[]>): Promise<Response> {
  if (queue) vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase(queue) as never)
  return PATCH(
    new NextRequest(`http://localhost/api/staff/citas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    params(id),
  )
}

function put(id: string, body: unknown): Promise<Response> {
  return PUT(
    new NextRequest(`http://localhost/api/staff/citas/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    params(id),
  )
}

beforeEach(() => {
  h.auth = true
  vi.mocked(getServiceSupabase).mockReset()
  resetCachedTableName()
})

describe("PATCH /api/staff/citas/[id]", () => {
  it("404 cuando no existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: null, error: null }] }) as never,
    )
    const res = await patch("x", { accion: "cancelar" })
    expect(res.status).toBe(404)
  })

  it("aceptar → 200 estado aceptada", async () => {
    const ff = f()
    const res = await patch("a", { accion: "aceptar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera", fecha_hora: ff, movida: false }, error: null },
        { data: [], error: null },
        { data: { id: "a", estado: "aceptada" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cita.estado).toBe("aceptada")
  })

  it("cancelar → 200 estado cancelada", async () => {
    const res = await patch("a", { accion: "cancelar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera" }, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).cita.estado).toBe("cancelada")
  })

  it("reenviar → 200 estado en_espera", async () => {
    const res = await patch("a", { accion: "reenviar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
        { data: { id: "a", estado: "en_espera" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).cita.estado).toBe("en_espera")
  })

  it("mover sin fecha_hora → 422", async () => {
    const res = await patch("a", { accion: "mover" }, {
      citas: [{ data: null, error: null }, { data: { id: "a", estado: "en_espera" }, error: null }],
    } as never)
    expect(res.status).toBe(422)
  })

  it("mover con fecha_hora → 200", async () => {
    const ff = f()
    const res = await patch("a", { accion: "mover", fecha_hora: ff }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera", fecha_hora: f() }, error: null },
        { data: { id: "a", fecha_hora: ff, movida: true }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
  })

  it("eliminar con estado cancelada → 200", async () => {
    const res = await patch("a", { accion: "eliminar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
        { data: null, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it("eliminar con estado aceptada → 422", async () => {
    const res = await patch("a", { accion: "eliminar" }, {
      citas: [{ data: null, error: null }, { data: { id: "a", estado: "aceptada" }, error: null }],
    } as never)
    expect(res.status).toBe(422)
  })
})

describe("PUT/DELETE /api/staff/citas/[id]", () => {
  it("PUT actualiza → 200", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: { id: "a" }, error: null }] }) as never,
    )
    const res = await put("a", { notas: "recordar" })
    expect(res.status).toBe(200)
  })

  it("DELETE → 200 ok", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: null, error: null }] }) as never,
    )
    const res = await DELETE(new NextRequest("http://localhost/api/staff/citas/a"), params("a"))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
