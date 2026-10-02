import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()

function readSource(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8")
}

describe("auth-dependency-boundary", () => {
  describe("lib/auth-core.ts no contiene dependencias de Supabase", () => {
    const src = readSource("lib/auth-core.ts")

    it("no importa @/lib/supabase", () => {
      expect(src).not.toContain("@/lib/supabase")
    })

    it("no importa @supabase", () => {
      expect(src).not.toContain("@supabase")
    })

    it("no referencia getServiceSupabase", () => {
      expect(src).not.toContain("getServiceSupabase")
    })

    it("no referencia getAnonSupabase", () => {
      expect(src).not.toContain("getAnonSupabase")
    })
  })

  describe("lib/auth-db.ts conserva el import dinámico de Supabase", () => {
    const src = readSource("lib/auth-db.ts")

    it("importa dinámicamente @/lib/supabase/server", () => {
      expect(src).toMatch(/await\s+import\(["']@\/lib\/supabase\/server["']\)/)
    })

    it("exporta validarCredencialesDB", () => {
      expect(src).toContain("export async function validarCredencialesDB")
    })

    it("importa verifyPassword desde auth-core", () => {
      expect(src).toMatch(/from\s+["']@\/lib\/auth-core["']/)
    })
  })

  describe("proxy.ts solo importa auth de cookie desde @/lib/auth-core", () => {
    const src = readSource("proxy.ts")

    it("no importa directamente @supabase", () => {
      expect(src).not.toContain("@supabase")
    })

    it("no importa directamente @/lib/supabase", () => {
      expect(src).not.toContain("@/lib/supabase")
    })

    it("solo importa COOKIE_NAME y verificarToken desde @/lib/auth-core", () => {
      expect(src).toContain('from "@/lib/auth-core"')
      expect(src).toMatch(/COOKIE_NAME/)
      expect(src).toMatch(/verificarToken/)
    })

    it("no importa getServiceSupabase", () => {
      expect(src).not.toContain("getServiceSupabase")
    })

    it("no importa auth-db", () => {
      expect(src).not.toContain("@/lib/auth-db")
    })
  })
})
