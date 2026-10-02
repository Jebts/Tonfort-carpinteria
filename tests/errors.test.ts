import { describe, it, expect } from "vitest"
import { sanitizeError } from "@/lib/errors"

describe("sanitizeError", () => {
  it("oculta errores de BD (violates/duplicate/relation/column/constraint/pg)", () => {
    const casos = [
      "duplicate key value violates unique constraint",
      "relation \"clientes\" does not exist",
      "column \"foo\" does not exist",
      "null value violates not-null constraint",
      "pg_query failed",
    ]
    for (const m of casos) {
      expect(sanitizeError(new Error(m))).toBe("Error interno")
    }
  })

  it("deja pasar mensajes inofensivos", () => {
    expect(sanitizeError(new Error("Algo salió mal"))).toBe("Algo salió mal")
  })

  it("usa fallback personalizado para errores sensibles", () => {
    expect(sanitizeError(new Error("violates"), "No disponible")).toBe("No disponible")
  })

  it("maneja err nulo", () => {
    expect(sanitizeError(null)).toBe("Error interno")
  })
})
