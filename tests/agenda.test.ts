import { describe, it, expect } from "vitest"
import {
  generarSlots,
  esDiaLaboral,
  slotKey,
  parseSlotKey,
  slotEnPasado,
  enRango,
  BLOQUES,
  DIAS_LABORALES,
} from "@/lib/agenda"

// Semana completa: lunes 17 ago 2026 .. domingo 23 ago 2026.
function semana(): { desde: Date; hasta: Date } {
  const desde = new Date(2026, 7, 17, 0, 0, 0, 0)
  const hasta = new Date(2026, 7, 23, 23, 59, 59, 999)
  return { desde, hasta }
}

describe("generarSlots", () => {
  it("solo genera días laborales (Lun–Sáb), excluye domingo", () => {
    const { desde, hasta } = semana()
    const slots = generarSlots(desde, hasta)
    const dias = new Set(slots.map((s) => s.getDay()))
    expect(dias.has(0)).toBe(false) // domingo excluido
    for (const d of dias) expect(DIAS_LABORALES).toContain(d)
  })

  it("genera 4 bloques por día laboral (6 días → 24)", () => {
    const { desde, hasta } = semana()
    const slots = generarSlots(desde, hasta)
    expect(slots.length).toBe(6 * BLOQUES.length)
  })

  it("respeta el rango (no incluye fuera de desde/hasta)", () => {
    // Los bloques se fijan en UTC; acotamos con el mismo meridiano.
    const desde = new Date(Date.UTC(2026, 7, 17, 14, 0, 0, 0))
    const hasta = new Date(Date.UTC(2026, 7, 17, 18, 0, 0, 0))
    const slots = generarSlots(desde, hasta)
    expect(slots.length).toBe(2) // 14:00 y 16:00 UTC
    expect(slots.every((s) => s >= desde && s <= hasta)).toBe(true)
  })
})

describe("slotKey / parseSlotKey", () => {
  it("roundtrip", () => {
    const d = new Date(2026, 7, 17, 8, 0, 0, 0)
    const key = slotKey(d)
    expect(parseSlotKey(key).getTime()).toBe(d.getTime())
  })
})

describe("esDiaLaboral", () => {
  it("lunes y sábado son laborales; domingo no", () => {
    expect(esDiaLaboral(new Date(2026, 7, 17))).toBe(true) // lun
    expect(esDiaLaboral(new Date(2026, 7, 22))).toBe(true) // sáb
    expect(esDiaLaboral(new Date(2026, 7, 23))).toBe(false) // dom
  })
})

describe("slotEnPasado", () => {
  it("fecha pasada → true; futura → false", () => {
    expect(slotEnPasado(new Date(Date.now() - 1000))).toBe(true)
    expect(slotEnPasado(new Date(Date.now() + 1000))).toBe(false)
  })
})

describe("enRango", () => {
  it("dentro y fuera de intervalo", () => {
    const desde = new Date(2026, 0, 1)
    const hasta = new Date(2026, 11, 31)
    expect(enRango(new Date(2026, 5, 1), desde, hasta)).toBe(true)
    expect(enRango(new Date(2025, 5, 1), desde, hasta)).toBe(false)
  })
})
