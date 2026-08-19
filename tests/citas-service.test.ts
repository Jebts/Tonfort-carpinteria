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
  upsertClientePorEmail,
  crearCitaWeb,
} from "@/lib/citas-service"

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
  const chains = { clientes: mk(state.clientes), citas: mk(state.citas) }
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
})

describe("upsertClientePorEmail", () => {
  it("crea cliente cuando no existe por email", async () => {
    const supabase = makeSupabase({
      clientes: [
        { data: null, error: null }, // select maybeSingle
        { data: { id: "cid" }, error: null }, // insert single
      ],
    })
    const id = await upsertClientePorEmail(supabase, {
      nombre: "Ana",
      email: "ana@x.com",
    })
    expect(id).toBe("cid")
  })

  it("devuelve el id existente cuando ya hay cliente con ese email", async () => {
    const supabase = makeSupabase({
      clientes: [{ data: { id: "existente" }, error: null }],
    })
    const id = await upsertClientePorEmail(supabase, {
      nombre: "Ana",
      email: "ana@x.com",
    })
    expect(id).toBe("existente")
  })
})

describe("crearCitaWeb", () => {
  beforeEach(() => {
    vi.mocked(getServiceSupabase).mockReset()
  })

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
      email: "juan@x.com",
      telefono: "123",
      descripcion: "mesa",
      fecha_hora: "2026-08-20T10:00:00.000Z",
    })

    expect(res.ok).toBe(true)
    expect(res.cita?.id).toBe("cita1")
  })

  it("retorna {ok:false} con error no vacío cuando supabase es null", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(null)

    const res = await crearCitaWeb({
      nombre: "Juan",
      email: "juan@x.com",
      telefono: "123",
      descripcion: "mesa",
      fecha_hora: "2026-08-20T10:00:00.000Z",
    })

    expect(res.ok).toBe(false)
    expect(typeof res.error).toBe("string")
    expect(res.error!.length).toBeGreaterThan(0)
  })
})
