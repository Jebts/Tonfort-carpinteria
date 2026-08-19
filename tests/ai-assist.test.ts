import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// requireStaff se resuelve a null (sesión válida) para aislar la lógica del handler.
vi.mock("@/lib/staff-auth", () => ({
  requireStaff: () => null,
}))

import { POST } from "@/app/api/staff/ai-suggest/route"
import { aiSuggestSchema } from "@/lib/validators"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/staff/ai-suggest", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )
}

describe("POST /api/staff/ai-suggest", () => {
  it("mock: devuelve sugerencia determinista con el nombre del campo", async () => {
    vi.stubEnv("LLM_PROVIDER", "mock")
    const res = await post({ campo: "Resumen", contexto: { titulo: "Cocina X" } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sugerencia).toContain("【IA mock】")
    expect(data.sugerencia).toContain("Resumen")
  })

  it("422 con body inválido (sin campo)", async () => {
    const res = await post({ contexto: {} })
    expect(res.status).toBe(422)
  })

  it("acepta promptExtra opcional", async () => {
    vi.stubEnv("LLM_PROVIDER", "mock")
    const res = await post({ campo: "Historia", contexto: {}, promptExtra: "tono cálido" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sugerencia).toContain("tono cálido")
  })
})

describe("aiSuggestSchema", () => {
  it("acepta campo + contexto + promptExtra", () => {
    expect(
      aiSuggestSchema.safeParse({ campo: "Historia", contexto: { titulo: "X" }, promptExtra: "breve" }).success,
    ).toBe(true)
  })

  it("rechaza campo vacío", () => {
    expect(aiSuggestSchema.safeParse({ campo: "" }).success).toBe(false)
  })
})
