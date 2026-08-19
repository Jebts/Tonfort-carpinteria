import { describe, it, expect } from "vitest"
import { citaStaffSchema, clienteSchema } from "@/lib/validators"

describe("citaStaffSchema", () => {
  it("acepta fecha_hora con campos opcionales", () => {
    const r = citaStaffSchema.safeParse({
      fecha_hora: "2026-08-20T10:00:00.000Z",
    })
    expect(r.success).toBe(true)
  })

  it("rechaza un estado inválido", () => {
    const r = citaStaffSchema.safeParse({
      fecha_hora: "2026-08-20T10:00:00.000Z",
      estado: "raro",
    })
    expect(r.success).toBe(false)
  })

  it("acepta cliente_id uuid", () => {
    const r = citaStaffSchema.safeParse({
      fecha_hora: "2026-08-20T10:00:00.000Z",
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
    })
    expect(r.success).toBe(true)
  })
})

describe("clienteSchema", () => {
  it("acepta nombre mínimo de 2 caracteres", () => {
    expect(clienteSchema.safeParse({ nombre: "An" }).success).toBe(true)
  })

  it("rechaza nombre demasiado corto", () => {
    expect(clienteSchema.safeParse({ nombre: "A" }).success).toBe(false)
  })

  it("rechaza email mal formado", () => {
    expect(
      clienteSchema.safeParse({ nombre: "Ana", email: "no-es-email" }).success,
    ).toBe(false)
  })

  it("acepta fase por defecto y campos opcionales", () => {
    const r = clienteSchema.safeParse({ nombre: "Ana", email: "a@b.com" })
    expect(r.success).toBe(true)
  })
})
