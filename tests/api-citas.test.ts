import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const h = vi.hoisted(() => ({ ok: true, ip: "1.2.3.4" as string | null }))
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => () => (h.ok ? { ok: true } : { ok: false, retryAfterMs: 1000 }),
  getClientIp: () => h.ip,
}))
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO: "Backend no configurado",
}))
vi.mock("@/lib/citas-service", () => ({
  calcularDisponibilidad: vi.fn(),
  crearCitaWeb: vi.fn(),
  getCitasTableName: vi.fn().mockResolvedValue("citas"),
  getModalidadPorSlug: vi.fn(),
  validarSlotLibre: vi.fn(),
}))

import { GET, POST } from "@/app/api/citas/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import {
  calcularDisponibilidad,
  crearCitaWeb,
  getCitasTableName,
  getModalidadPorSlug,
  validarSlotLibre,
} from "@/lib/citas-service"
import { makeSupabase } from "./helpers/supabase"
import type { ModalidadCita } from "@/lib/supabase/types"

function futuraISO(): string {
  return new Date(Date.now() + 86_400_000).toISOString()
}

function modalidad(over: Partial<ModalidadCita> = {}): ModalidadCita {
  return {
    id: "mod-virtual",
    nombre: "Virtual",
    slug: "virtual",
    descripcion: null,
    costo: 0,
    duracion_minutos: 90,
    activo: true,
    orden: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

// El flujo público no pide email: nombre, WhatsApp, descripción y modalidad.
function bodyCita(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nombre: "Juan",
    telefono: "3001234567",
    descripcion: "una mesa",
    fecha_hora: futuraISO(),
    modalidad: "virtual",
    ...over,
  }
}

function postCita(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/citas", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  )
}

beforeEach(() => {
  h.ok = true
  h.ip = "1.2.3.4"
  vi.mocked(getServiceSupabase).mockReset()
  vi.mocked(calcularDisponibilidad).mockReset()
  vi.mocked(crearCitaWeb).mockReset()
  vi.mocked(getCitasTableName).mockResolvedValue("citas")
  vi.mocked(validarSlotLibre).mockReset()
  vi.mocked(validarSlotLibre).mockResolvedValue({ ok: true })
  vi.mocked(getModalidadPorSlug).mockReset()
  vi.mocked(getModalidadPorSlug).mockResolvedValue(modalidad())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("GET /api/citas", () => {
  it("200 con slots", async () => {
    vi.mocked(calcularDisponibilidad).mockResolvedValue([
      { fecha_hora: "2026-08-17T13:00:00.000Z", duracion_minutos: 120, estado: "vacio", citas: [], enEspera: 0, canceladas: 0 },
    ])
    const res = await GET(new NextRequest("http://localhost/api/citas"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slots.length).toBe(1)
  })

  it("pasa la modalidad a calcularDisponibilidad para el cupo por modalidad", async () => {
    vi.mocked(calcularDisponibilidad).mockResolvedValue([])
    await GET(
      new NextRequest("http://localhost/api/citas?modalidad=virtual&desde=2026-08-17&hasta=2026-08-24"),
    )
    expect(vi.mocked(calcularDisponibilidad).mock.calls[0][2]).toMatchObject({
      modalidadId: "mod-virtual",
      incluirCanceladas: false,
    })
  })
})

describe("POST /api/citas", () => {
  it("429 por rate-limit", async () => {
    h.ok = false
    const res = await postCita(bodyCita())
    expect(res.status).toBe(429)
  })

  it("400 JSON inválido", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/citas", { method: "POST", body: "{no-json" }),
    )
    expect(res.status).toBe(400)
  })

  it("422 schema inválido", async () => {
    const res = await postCita({ nombre: "Juan" })
    expect(res.status).toBe(422)
  })

  it("422 si se reenvía email: el campo ya no existe", async () => {
    const res = await postCita(bodyCita({ email: "juan@x.com", modalidad: undefined }))
    expect(res.status).toBe(422)
  })

  it("422 modalidad fuera del catálogo", async () => {
    vi.mocked(getModalidadPorSlug).mockResolvedValue(null)
    const res = await postCita(bodyCita())
    expect(res.status).toBe(422)
  })

  it("422 fecha en el pasado", async () => {
    const res = await postCita(
      bodyCita({ fecha_hora: new Date(Date.now() - 86_400_000).toISOString() }),
    )
    expect(res.status).toBe(422)
  })

  it("409 si la misma IP ya tiene una cita en el bloque", async () => {
    h.ip = "1.2.3.4"
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: [{ id: "old" }], error: null }] }) as never,
    )
    const res = await postCita(bodyCita())
    // 409 (conflicto), no 429: el límite de tasa es otro y tiene su propio código.
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain("este bloque")
  })

  it("sin IP conocida no se agrupa a los visitantes por `ip IS NULL`", async () => {
    // Con IP desconocida la deduplicacion por IP se omite: si no, todas las
    // citas sin IP (incluidas las que crea staff) agruparían a los visitantes.
    h.ip = null
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: [{ id: "old" }], error: null }] }) as never,
    )
    vi.mocked(crearCitaWeb).mockResolvedValue({ ok: true, cita: { id: "c1" } as never })
    const res = await postCita(bodyCita())
    expect(res.status).toBe(201)
  })

  it("201 crea (sin ip, backend ok)", async () => {
    h.ip = null
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({}) as never)
    vi.mocked(crearCitaWeb).mockResolvedValue({ ok: true, cita: { id: "c1" } as never })
    const res = await postCita(bodyCita())
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.cita.id).toBe("c1")
  })

  it("el precio lo pone la BD, nunca el cliente", async () => {
    h.ip = null
    vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase({}) as never)
    vi.mocked(crearCitaWeb).mockResolvedValue({ ok: true, cita: { id: "c1" } as never })
    vi.mocked(getModalidadPorSlug).mockResolvedValue(
      modalidad({ id: "mod-pres", slug: "presencial", costo: 70000, duracion_minutos: 120 }),
    )

    await postCita(bodyCita({ modalidad: "presencial", precio: 0 }))

    expect(vi.mocked(crearCitaWeb).mock.calls[0][0]).toMatchObject({
      modalidad_id: "mod-pres",
      precio_copiado: 70000,
      duracion_minutos: 120,
    })
  })

  it("500 backend null", async () => {
    h.ip = null
    vi.mocked(getServiceSupabase).mockReturnValue(null)
    const res = await postCita(bodyCita())
    expect(res.status).toBe(500)
  })
})
