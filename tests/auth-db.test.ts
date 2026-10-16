import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeSupabase } from "@/tests/helpers/supabase"
import type { SupabaseClient } from "@supabase/supabase-js"
import { hashPasswordForEnv } from "@/lib/auth-core"

const mockSupabase = vi.hoisted(() => ({
  client: null as unknown as SupabaseClient,
}))

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => mockSupabase.client,
}))

import { validarCredencialesDB } from "@/lib/auth-db"

describe("validarCredencialesDB", () => {
  beforeEach(() => {
    process.env.INITIAL_ADMIN_PASSWORD = "TonfortAdmin2026!"
  })

  it("permite login con email completo", async () => {
    const hash = await hashPasswordForEnv("pass12345")
    mockSupabase.client = makeSupabase({
      usuarios: [
        {
          data: {
            id: "user-1",
            email: "admin@tonfort.local",
            password_hash: hash,
            nombre: "Admin",
            rol: "admin",
            activo: true,
          },
          error: null,
        },
      ],
    }) as unknown as SupabaseClient

    const sesion = await validarCredencialesDB("admin@tonfort.local", "pass12345")
    expect(sesion).not.toBeNull()
    expect(sesion?.usuario).toBe("admin@tonfort.local")
    expect(sesion?.rol).toBe("admin")
  })

  it("permite login con solo nombre de usuario (ej. 'admin')", async () => {
    const hash = await hashPasswordForEnv("pass12345")
    mockSupabase.client = makeSupabase({
      usuarios: [
        {
          data: {
            id: "user-1",
            email: "admin@tonfort.local",
            password_hash: hash,
            nombre: "Admin",
            rol: "admin",
            activo: true,
          },
          error: null,
        },
      ],
    }) as unknown as SupabaseClient

    const sesion = await validarCredencialesDB("admin", "pass12345")
    expect(sesion).not.toBeNull()
    expect(sesion?.usuario).toBe("admin@tonfort.local")
  })

  it("retorna null si la contraseña es incorrecta", async () => {
    const hash = await hashPasswordForEnv("correct_pass")
    mockSupabase.client = makeSupabase({
      usuarios: [
        {
          data: {
            id: "user-2",
            email: "disenador@tonfort.local",
            password_hash: hash,
            nombre: "Diseñador",
            rol: "disenador",
            activo: true,
          },
          error: null,
        },
      ],
    }) as unknown as SupabaseClient

    const sesion = await validarCredencialesDB("disenador", "wrong_pass")
    expect(sesion).toBeNull()
  })

  it("retorna null si el usuario no existe", async () => {
    mockSupabase.client = makeSupabase({
      usuarios: [
        { data: null, error: null },
      ],
    }) as unknown as SupabaseClient

    const sesion = await validarCredencialesDB("noexiste", "pass")
    expect(sesion).toBeNull()
  })
})
