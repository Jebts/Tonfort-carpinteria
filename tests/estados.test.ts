import { describe, it, expect } from "vitest"
import { estiloEstado, etiquetaCita, dotColor } from "@/lib/estados"

describe("estiloEstado", () => {
  it("mapea los 4 estados de slot a su estilo", () => {
    for (const estado of ["vacio", "vacio", "en_espera", "aceptada", "cancelada"] as const) {
      const e = estiloEstado(estado)
      expect(e.label).toBeTruthy()
      expect(e.className).toBeTruthy()
      expect(e.badge).toBeTruthy()
      expect(e.dot).toBeTruthy()
    }
  })

  it("desconocido cae a vacio", () => {
    // @ts-expect-error probando valor fuera de enum
    expect(estiloEstado("raro").label).toBe(estiloEstado("vacio").label)
  })
})

describe("etiquetaCita", () => {
  it("refleja el estado base", () => {
    expect(etiquetaCita("en_espera", false)).toBe("En espera")
    expect(etiquetaCita("aceptada", false)).toBe("Confirmadas")
    expect(etiquetaCita("cancelada", false)).toBe("Cancelada")
  })
})

describe("dotColor", () => {
  it("devuelve una clase de color por estado visual", () => {
    expect(dotColor("aceptada")).toContain("bg-emerald-500")
    expect(dotColor("en_espera")).toContain("bg-amber-500")
    expect(dotColor("cancelada")).toContain("bg-rose-500")
  })
})
