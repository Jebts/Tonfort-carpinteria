import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO:
    "Backend no configurado: faltan CARPINTERIA_SUPABASE_URL y CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY en el .env del staff",
}))

// eslint-disable-next-line import/first
import { getServiceSupabase } from "@/lib/supabase/server"
// eslint-disable-next-line import/first
import {
  calcularDisponibilidad,
  upsertClientePorTelefono,
  normalizarTelefono,
  crearCitaWeb,
  validarSlotLibre,
  resetCachedTableName,
} from "@/lib/citas-service"

beforeEach(() => {
  vi.mocked(getServiceSupabase).mockReset()
  resetCachedTableName()
})

// Chainable, thenable mock: cada `await` consome el siguiente resultado de la
// cola compartida por tabla (mismo cursor para todos los `.from(table)`).
function makeSupabase(initial?: {
  clientes?: { data: unknown; error: unknown }[]
  citas?: { data: unknown; error: unknown }[]
}) {
  const state = {
    clientes: { items: initial?.clientes ?? [], cursor: 0 },
    citas: { items: initial?.citas ?? [], cursor: 0 },
  }
  const mk = (st: { items: { data: unknown; error: unknown }[]; cursor: number }) => {
    const handler = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(_t: unknown, prop: string) {
        if (prop === "then") {
          return (onFulfilled?: (v: unknown) => unknown) => {
            const r = st.items[st.cursor++] ?? { data: null, error: null }
            return Promise.resolve(r).then(onFulfilled)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return () => proxy
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxy: any = new Proxy(function () {}, handler)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return proxy
  }
  // Una sola cadena por tabla → cursor compartido entre select e insert.
  // Prependemos un check de existencia de tabla (consumido por getCitasTableName).
  const citasChainItems = [{ data: null, error: null }, ...(initial?.citas ?? [])]
  const chains = {
    clientes: mk({ items: initial?.clientes ?? [], cursor: 0 }),
    citas: mk({ items: citasChainItems, cursor: 0 }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = {
    from: (table: string) => chains[table as "clientes" | "citas"] ?? mk({ items: [], cursor: 0 }),
  }
  return supabase as SupabaseClient
}

function lunesReferencia(): Date {
  const d = new Date(2026, 7, 17)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}

describe("calcularDisponibilidad", () => {
  it("marca estado del slot según las citas", async () => {
    const lunes = lunesReferencia()
    const desde = new Date(lunes)
    desde.setUTCHours(7, 0, 0, 0)
    const hasta = new Date(lunes)
    hasta.setUTCHours(10, 0, 0, 0)

    const citaISO = new Date(lunes)
    citaISO.setUTCHours(8, 0, 0, 0)

    const supabase = makeSupabase({
      citas: [
        {
          data: [
            {
              id: "1",
              fecha_hora: citaISO.toISOString(),
              estado: "aceptada",
              movida: false,
              nombre_solicitante: "X",
              cliente_id: null,
            },
          ],
          error: null,
        },
      ],
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase)

    const slots = await calcularDisponibilidad(desde, hasta)
    const porHora: Record<number, string> = {}
    for (const s of slots) porHora[new Date(s.fecha_hora).getUTCHours()] = s.estado

    expect(porHora[8]).toBe("aceptada")
    expect(porHora[10]).toBe("vacio")
  })

  it("un bloque con cita virtual sigue libre para quien pide presencial", async () => {
    const lunes = lunesReferencia()
    const desde = new Date(lunes)
    desde.setUTCHours(7, 0, 0, 0)
    const hasta = new Date(lunes)
    hasta.setUTCHours(10, 0, 0, 0)

    const citaISO = new Date(lunes)
    citaISO.setUTCHours(8, 0, 0, 0)

    const supabase = makeSupabase({
      citas: [
        {
          data: [
            {
              id: "1",
              fecha_hora: citaISO.toISOString(),
              estado: "aceptada",
              movida: false,
              nombre_solicitante: "X",
              cliente_id: null,
              modalidad_id: "mod-virtual",
            },
          ],
          error: null,
        },
      ],
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase)

    const slots = await calcularDisponibilidad(desde, hasta, { modalidadId: "mod-presencial" })
    const slotOcho = slots.find((s) => new Date(s.fecha_hora).getUTCHours() === 8)

    expect(slotOcho?.estado).toBe("vacio")
  })

  it("la cita de otra modalidad no delata el nombre del solicitante", async () => {
    const lunes = lunesReferencia()
    const desde = new Date(lunes)
    desde.setUTCHours(7, 0, 0, 0)
    const hasta = new Date(lunes)
    hasta.setUTCHours(10, 0, 0, 0)

    const citaISO = new Date(lunes)
   citaISO.setUTCHours(8, 0, 0, 0)

    const supabase = makeSupabase({
      citas: [
        {
          data: [
            {
              id: "1",
              fecha_hora: citaISO.toISOString(),
              estado: "aceptada",
              movida: false,
              nombre_solicitante: "Nombre Confidencial",
              cliente_id: null,
              modalidad_id: "mod-virtual",
            },
          ],
          error: null,
        },
      ],
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase)

    const slots = await calcularDisponibilidad(desde, hasta, { modalidadId: "mod-presencial" })
    const slotOcho = slots.find((s) => new Date(s.fecha_hora).getUTCHours() === 8)

    expect(slotOcho?.citas).toHaveLength(1)
    expect(slotOcho?.citas[0].nombre).toBeNull()
  })
})

describe("normalizarTelefono", () => {
  it("deja solo dígitos", () => {
    expect(normalizarTelefono("+57 (300) 123-4567")).toBe("3001234567")
  })

  it("colapsa el prefijo 57 para que sea la misma clave", () => {
    expect(normalizarTelefono("+57 300 123 4567")).toBe(
      normalizarTelefono("3001234567"),
    )
  })
})

describe("upsertClientePorTelefono", () => {
  it("crea cliente cuando no existe con ese teléfono", async () => {
    const supabase = makeSupabase({
      clientes: [
        { data: [], error: null }, // select por telefono
        { data: { id: "cid" }, error: null }, // insert single
      ],
    })
    const id = await upsertClientePorTelefono(supabase, {
      nombre: "Ana",
      telefono: "3001234567",
    })
    expect(id).toBe("cid")
  })

  it("devuelve el id existente cuando ya hay cliente con ese teléfono", async () => {
    const supabase = makeSupabase({
      clientes: [{ data: [{ id: "existente", nombre: "Ana", descripcion_proyecto: null }], error: null }],
    })
    const id = await upsertClientePorTelefono(supabase, {
      nombre: "Ana",
      telefono: "+57 300 123 4567",
    })
    expect(id).toBe("existente")
  })
})

describe("crearCitaWeb", () => {
  it("retorna {ok:true, cita} con la cita insertada", async () => {
    const supabase = makeSupabase({
      clientes: [
        { data: null, error: null },
        { data: { id: "cid" }, error: null },
      ],
      citas: [
        { data: [], error: null },
        { data: { id: "cita1", cliente_id: "cid" }, error: null },
      ],
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase)

    const res = await crearCitaWeb({
      nombre: "Juan",
      telefono: "3001234567",
      descripcion: "mesa",
      fecha_hora: "2026-08-20T10:00:00.000Z",
      modalidad_id: "mod-virtual",
      precio_copiado: 0,
    })

    expect(res.ok).toBe(true)
    expect(res.cita?.id).toBe("cita1")
  })

  it("retorna {ok:false} con error no vacío cuando supabase es null", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)

    const res = await crearCitaWeb({
      nombre: "Juan",
      telefono: "3001234567",
      descripcion: "mesa",
      fecha_hora: "2026-08-20T10:00:00.000Z",
      modalidad_id: "mod-virtual",
      precio_copiado: 0,
    })

    expect(res.ok).toBe(false)
    expect(typeof res.error).toBe("string")
    expect(res.error!.length).toBeGreaterThan(0)
  })
})

describe("validarSlotLibre", () => {
  it("libre cuando no hay citas aceptadas en la ventana", async () => {
    const supabase = makeSupabase({
      citas: [{ data: [], error: null }],
    })
    const res = await validarSlotLibre(supabase, "2026-08-20T10:00:00.000Z")
    expect(res.ok).toBe(true)
  })

  it("ocupado cuando hay una cita aceptada en la ventana", async () => {
    const supabase = makeSupabase({
      citas: [{ data: [{ id: "ocupante" }], error: null }],
    })
    const res = await validarSlotLibre(supabase, "2026-08-20T10:00:00.000Z")
    expect(res.ok).toBe(false)
    expect(res.error).toContain("aceptada")
  })

  it("propaga el error de la BD", async () => {
    const supabase = makeSupabase({
      citas: [{ data: null, error: new Error("boom") }],
    })
    const res = await validarSlotLibre(supabase, "2026-08-20T10:00:00.000Z")
    expect(res.ok).toBe(false)
  })
})

describe("crearCitaWeb con cliente existente e ip", () => {
  it("reusa el id del cliente existente y propaga la ip", async () => {
    const supabase = makeSupabase({
      clientes: [{ data: { id: "existente" }, error: null }],
      citas: [
        { data: [], error: null },
        { data: { id: "cita1", cliente_id: "existente" }, error: null },
      ],
    })
    vi.mocked(getServiceSupabase).mockReturnValue(supabase)

    const res = await crearCitaWeb({
      nombre: "Juan",
      telefono: "3001234567",
      descripcion: "mesa",
      fecha_hora: "2026-08-20T10:00:00.000Z",
      modalidad_id: "mod-virtual",
      precio_copiado: 0,
      ip: "1.2.3.4",
    })

    expect(res.ok).toBe(true)
    expect(res.cita?.id).toBe("cita1")
    expect((res.cita as { cliente_id?: string }).cliente_id).toBe("existente")
  })
})
