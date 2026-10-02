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

import { GET, POST } from "@/app/api/staff/clientes/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { makeSupabase } from "./helpers/supabase"

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/staff/clientes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )
}

beforeEach(() => {
  h.auth = true
  vi.mocked(getServiceSupabase).mockReset()
})

describe("GET/POST /api/staff/clientes", () => {
  it("401 sin sesión (GET)", async () => {
    h.auth = false
    const res = await GET(new NextRequest("http://localhost/api/staff/clientes"))
    expect(res.status).toBe(401)
  })

  it("401 sin sesión (POST)", async () => {
    h.auth = false
    const res = await post({ nombre: "Ana" })
    expect(res.status).toBe(401)
  })

  it("GET lista 200", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ clientes: [{ data: [{ id: "c1" }], error: null }] }) as never,
    )
    const res = await GET(new NextRequest("http://localhost/api/staff/clientes"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.clientes[0].id).toBe("c1")
  })

  it("POST 201 crea", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ clientes: [{ data: { id: "n" }, error: null }] }) as never,
    )
    const res = await post({ nombre: "Ana", email: "a@b.com" })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.cliente.id).toBe("n")
  })

  it("POST 422 schema inválido", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({}) as never)
    const res = await post({ nombre: "A" })
    expect(res.status).toBe(422)
  })

  it("POST 500 backend null", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await post({ nombre: "Ana", email: "a@b.com" })
    expect(res.status).toBe(500)
  })
})
