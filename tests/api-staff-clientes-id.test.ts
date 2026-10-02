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

import { GET, PUT, DELETE } from "@/app/api/staff/clientes/[id]/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { resetCachedTableName } from "@/lib/citas-service"
import { makeSupabase } from "./helpers/supabase"

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function put(id: string, body: unknown): Promise<Response> {
  return PUT(
    new NextRequest(`http://localhost/api/staff/clientes/${id}`, {
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

describe("GET /api/staff/clientes/[id]", () => {
  it("404 cuando no existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ clientes: [{ data: null, error: null }] }) as never,
    )
    const res = await GET(new NextRequest("http://localhost/api/staff/clientes/x"), params("x"))
    expect(res.status).toBe(404)
  })

  it("200 cuando existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ clientes: [{ data: { id: "x" }, error: null }] }) as never,
    )
    const res = await GET(new NextRequest("http://localhost/api/staff/clientes/x"), params("x"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cliente.id).toBe("x")
  })
})

describe("PUT /api/staff/clientes/[id]", () => {
  it("200 actualiza", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ clientes: [{ data: { id: "x" }, error: null }] }) as never,
    )
    const res = await put("x", { nombre: "Nuevo" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cliente.id).toBe("x")
  })
})

describe("DELETE /api/staff/clientes/[id] (cascade)", () => {
  it("200 borra citas del cliente y luego el cliente", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({
        citas: [{ data: null, error: null }, { data: null, error: null }],
        clientes: [{ data: null, error: null }],
      }) as never,
    )
    const res = await DELETE(new NextRequest("http://localhost/api/staff/clientes/x"), params("x"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
