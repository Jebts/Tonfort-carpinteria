import { describe, it, expect, vi, afterEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO: "Backend no configurado",
}))

import { resolverLLM, mockSugerir, sugerirTexto } from "@/lib/llm"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("resolverLLM", () => {
  it("mock cuando LLM_PROVIDER=mock", () => {
    vi.stubEnv("LLM_PROVIDER", "mock")
    expect(resolverLLM().use_mock).toBe(true)
  })

  it("openai usa base_url y api_key de OPENAI_*", () => {
    vi.stubEnv("LLM_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "k")
    const cfg = resolverLLM()
    expect(cfg.use_mock).toBe(false)
    expect(cfg.base_url).toContain("openai.com")
    expect(cfg.api_key).toBe("k")
  })

  it("default (groq) sin prefijo ni provider conocido", () => {
    vi.stubEnv("LLM_PROVIDER", "groq")
    const cfg = resolverLLM()
    expect(cfg.use_mock).toBe(false)
    expect(cfg.base_url).toContain("groq.com")
  })

  it("valor desconocido cae a groq (default)", () => {
    vi.stubEnv("LLM_PROVIDER", "zzz")
    expect(resolverLLM().base_url).toContain("groq.com")
  })
})

describe("mockSugerir", () => {
  it("incluye campo, contexto y promptExtra", () => {
    const txt = mockSugerir({
      campo: "Resumen",
      contexto: { titulo: "Cocina" },
      promptExtra: "tono cálido",
    })
    expect(txt).toContain("【IA mock】")
    expect(txt).toContain("Resumen")
    expect(txt).toContain("Cocina")
    expect(txt).toContain("tono cálido")
  })

  it("omite contexto vacío", () => {
    const txt = mockSugerir({ campo: "x", contexto: {} })
    expect(txt).not.toContain("Contexto del proyecto")
  })
})

describe("sugerirTexto", () => {
  it("LLM_PROVIDER=mock devuelve sugerencia determinista", async () => {
    vi.stubEnv("LLM_PROVIDER", "mock")
    const txt = await sugerirTexto({ campo: "Resumen", contexto: { titulo: "X" } })
    expect(txt).toContain("【IA mock】")
  })

  it("groq con fetch fallido cae a mockSugerir", async () => {
    vi.stubEnv("LLM_PROVIDER", "groq")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    const txt = await sugerirTexto({ campo: "Historia", contexto: {} })
    expect(txt).toContain("【IA mock】")
  })
})
