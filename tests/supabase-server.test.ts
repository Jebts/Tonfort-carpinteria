import { describe, it, expect, vi, afterEach } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadServer() {
  vi.resetModules()
  return (await import("@/lib/supabase/server")) as typeof import("@/lib/supabase/server")
}

describe("getServiceSupabase", () => {
  it("retorna null si faltan CARPINTERIA_SUPABASE_URL / SERVICE_ROLE_KEY", async () => {
    delete process.env.CARPINTERIA_SUPABASE_URL
    delete process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY
    const mod = await loadServer()
    expect(mod.getServiceSupabase()).toBeNull()
    expect(mod.SUPABASE_CONFIGURED).toBe(false)
  })

  it("retorna un cliente no-null y lo cachea cuando hay env", async () => {
    process.env.CARPINTERIA_SUPABASE_URL = "https://example.supabase.co"
    process.env.CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    const mod = await loadServer()
    const a = mod.getServiceSupabase()
    const b = mod.getServiceSupabase()
    expect(a).not.toBeNull()
    expect(a).toBe(b) // cached
    expect(mod.SUPABASE_CONFIGURED).toBe(true)
  })

  it("BACKEND_NO_CONFIGURADO es un mensaje claro", async () => {
    const mod = await loadServer()
    expect(typeof mod.BACKEND_NO_CONFIGURADO).toBe("string")
    expect(mod.BACKEND_NO_CONFIGURADO.length).toBeGreaterThan(0)
  })
})
