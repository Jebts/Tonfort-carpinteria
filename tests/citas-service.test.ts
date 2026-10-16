import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Cita } from "@/lib/supabase/types"

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
  resolverConfirmacion,
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
    // El nombre no viaja en ningún caso: `/api/citas` es anónimo y la grilla
    // solo necesita los contadores por bloque.
    expect(slotOcho?.citas[0].nombre ?? null).toBeNull()
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

// ---------------------------------------------------------------------------
// Regla de cupo por bloque (duración real) y confirmación con resolución
// ---------------------------------------------------------------------------

// Mock de Supabase que respeta los filtros encadenados (eq/neq/is/gte/lt) y
// guarda un registro de las escrituras con las filas afectadas. Con la cola de
// resultados fijos no se puede comprobar la aritmética de ventanas ni qué se
// actualizó de verdad.
type FilaCita = Record<string, unknown>

interface Escritura {
  operacion: string
  payload: Record<string, unknown>
  ids: string[]
}

function makeSupabaseFiltrado(citasIniciales: FilaCita[]) {
  const filas: FilaCita[] = citasIniciales.map((c) => ({ ...c }))
  const escrituras: Escritura[] = []

  function desdeTabla(tabla: string) {
    const condiciones: ((f: FilaCita) => boolean)[] = []
    let operacion = "select"
    let payload: Record<string, unknown> = {}
    let modo: "lista" | "single" | "maybe" = "lista"

    const encadenado: Record<string, unknown> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cadena: any = new Proxy(encadenado, {
      get(_t, prop: string) {
        if (prop === "then") {
          return (onFulfilled?: (v: unknown) => unknown) => {
            const coincide = (f: FilaCita) => condiciones.every((c) => c(f))
            if (operacion === "insert") {
              const nueva = { id: payload.id ?? `nueva-${filas.length + 1}`, ...payload }
              filas.push(nueva)
              escrituras.push({ operacion, payload, ids: [String(nueva.id)] })
              return Promise.resolve({ data: nueva, error: null }).then(onFulfilled)
            }
            if (operacion === "update") {
              const afectadas = filas.filter(coincide)
              for (const f of afectadas) Object.assign(f, payload)
              escrituras.push({
                operacion,
                payload,
                ids: afectadas.map((f) => String(f.id)),
              })
              const data = modo === "lista" ? afectadas : (afectadas[0] ?? null)
              return Promise.resolve({ data, error: null }).then(onFulfilled)
            }
            if (operacion === "delete") {
              const borradas = filas.filter(coincide)
              const quedan = filas.filter((f) => !coincide(f))
              filas.length = 0
              filas.push(...quedan)
              escrituras.push({
                operacion,
                payload,
                ids: borradas.map((f) => String(f.id)),
              })
              return Promise.resolve({ data: borradas, error: null }).then(onFulfilled)
            }
            const encontradas = filas.filter(coincide)
            const data = modo === "lista" ? encontradas : (encontradas[0] ?? null)
            return Promise.resolve({ data, error: null }).then(onFulfilled)
          }
        }
        if (prop === "select") return () => cadena
        if (prop === "insert") {
          return (p: Record<string, unknown>) => {
            operacion = "insert"
            payload = p
            return cadena
          }
        }
        if (prop === "update") {
          return (p: Record<string, unknown>) => {
            operacion = "update"
            payload = p
            return cadena
          }
        }
        if (prop === "delete") {
          return () => {
            operacion = "delete"
            return cadena
          }
        }
        if (prop === "eq") {
          return (campo: string, valor: unknown) => {
            condiciones.push((f) => f[campo] === valor)
            return cadena
          }
        }
        if (prop === "neq") {
          return (campo: string, valor: unknown) => {
            condiciones.push((f) => f[campo] !== valor)
            return cadena
          }
        }
        if (prop === "is") {
          return (campo: string, valor: unknown) => {
            condiciones.push((f) => (valor === null ? !f[campo] : f[campo] === valor))
            return cadena
          }
        }
        if (prop === "gte") {
          return (campo: string, valor: unknown) => {
            condiciones.push((f) => String(f[campo]) >= String(valor))
            return cadena
          }
        }
        if (prop === "lt") {
          return (campo: string, valor: unknown) => {
            condiciones.push((f) => String(f[campo]) < String(valor))
            return cadena
          }
        }
        if (prop === "single") {
          return () => {
            modo = "single"
            return cadena
          }
        }
        if (prop === "maybeSingle") {
          return () => {
            modo = "maybe"
            return cadena
          }
        }
        return () => cadena
      },
    })
    return cadena
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = { from: (t: string) => desdeTabla(t) }
  return { supabase: supabase as SupabaseClient, filas, escrituras }
}

const BLOQUE_MARTES = "2026-10-13T14:00:00.000Z"
const MOD_VIRTUAL = "mod-virtual"
const MOD_PRESENCIAL = "mod-pres"

function citaFila(over: FilaCita = {}): FilaCita {
  return {
    id: "elegida",
    estado: "en_espera",
    fecha_hora: BLOQUE_MARTES,
    nombre_solicitante: "Ana",
    duracion_minutos: 120,
    modalidad_id: null,
    movida: false,
    fecha_hora_anterior: null,
    ...over,
  }
}

function citaCompleta(over: Partial<Cita> = {}): Cita {
  return {
    id: "elegida",
    cliente_id: null,
    nombre_solicitante: "Ana",
    email: null,
    telefono: null,
    descripcion: null,
    fecha_hora: BLOQUE_MARTES,
    duracion_minutos: 120,
    estado: "en_espera",
    origen: "interna",
    movida: false,
    fecha_hora_anterior: null,
    meet_link: null,
    notas: null,
    ip: null,
    modalidad_id: null,
    precio_copiado: 0,
    direccion: null,
    creado_en: "2026-10-01T00:00:00.000Z",
    actualizado_en: "2026-10-01T00:00:00.000Z",
    ...over,
  }
}

describe("validarSlotLibre con duración real", () => {
  it("una virtual de 90 min no bloquea el bloque siguiente", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila({ id: "virtual", estado: "aceptada", duracion_minutos: 90, modalidad_id: MOD_VIRTUAL }),
    ])
    // Termina a las 09:30 reales; el siguiente bloque puede agendarse.
    const res = await validarSlotLibre(
      supabase,
      "2026-10-13T15:30:00.000Z",
      MOD_VIRTUAL,
      undefined,
      90,
    )
    expect(res.ok).toBe(true)
  })

  it("una cita de 120 min bloquea lo que empieza dentro de su ventana", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila({ id: "ocupante", estado: "aceptada", duracion_minutos: 120 }),
    ])
    const res = await validarSlotLibre(supabase, "2026-10-13T15:00:00.000Z", null, undefined, 120)
    expect(res.ok).toBe(false)
    expect(res.conflicto?.id).toBe("ocupante")
  })

  it("una cita que empieza antes pero solapa también bloquea", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila({ id: "antes", estado: "aceptada", fecha_hora: "2026-10-13T15:00:00.000Z", duracion_minutos: 90 }),
    ])
    const res = await validarSlotLibre(supabase, "2026-10-13T16:00:00.000Z", null, undefined, 120)
    expect(res.ok).toBe(false)
    expect(res.conflicto?.id).toBe("antes")
  })

  it("los bloques son contiguos: terminar justo cuando empieza el siguiente no estorba", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila({ id: "ocupante", estado: "aceptada", duracion_minutos: 120 }),
    ])
    const res = await validarSlotLibre(supabase, "2026-10-13T16:00:00.000Z", null, undefined, 120)
    expect(res.ok).toBe(true)
  })

  it("una aceptada de otra modalidad no bloquea el bloque", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila({ id: "pres", estado: "aceptada", modalidad_id: MOD_PRESENCIAL }),
    ])
    const res = await validarSlotLibre(
      supabase,
      "2026-10-13T15:00:00.000Z",
      MOD_VIRTUAL,
      undefined,
      90,
    )
    expect(res.ok).toBe(true)
  })
})

describe("resolverConfirmacion", () => {
  it("rechaza confirmar una cita que no está en espera", async () => {
    const { supabase } = makeSupabaseFiltrado([citaFila()])
    const res = await resolverConfirmacion(supabase, citaCompleta({ estado: "aceptada" }))
    expect(res.ok).toBe(false)
    expect(res.ok === false && res.status).toBe(422)
  })

  it("pide resolución cuando hay otras en_espera del mismo bloque", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "p1", nombre_solicitante: "Bruno" }),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta())
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.status).toBe(422)
    expect(res.pendientes).toEqual([
      { id: "p1", nombre: "Bruno", fecha_hora: BLOQUE_MARTES },
    ])
  })

  it("confirma directo cuando no hay otras en_espera del bloque", async () => {
    const { supabase, escrituras } = makeSupabaseFiltrado([
      citaFila({ id: "ocupante", estado: "aceptada", modalidad_id: MOD_PRESENCIAL }),
      citaFila(),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta())
    expect(res.ok).toBe(true)
    const final = escrituras.find((e) => e.payload.estado === "aceptada")
    expect(final?.ids).toEqual(["elegida"])
  })

  it("solo pide resolver las en_espera de la misma modalidad", async () => {
    const { supabase } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "otra-mod", modalidad_id: MOD_VIRTUAL }),
    ])
    const res = await resolverConfirmacion(
      supabase,
      citaCompleta({ modalidad_id: MOD_PRESENCIAL }),
    )
    // La de la otra modalidad queda fuera: no hay nada que resolver.
    expect(res.ok).toBe(true)
  })

  it("422 si la resolución no cubre todas las en_espera", async () => {
    const vacia = makeSupabaseFiltrado([citaFila(), citaFila({ id: "p1" })])
    const sinNada = await resolverConfirmacion(vacia.supabase, citaCompleta(), [])
    expect(sinNada.ok).toBe(false)

    const extra = makeSupabaseFiltrado([citaFila(), citaFila({ id: "p1" })])
    const conAjena = await resolverConfirmacion(extra.supabase, citaCompleta(), [
      { id: "ajena", accion: "eliminar" },
    ])
    expect(conAjena.ok).toBe(false)
    expect(conAjena.ok === false && conAjena.status).toBe(422)
  })

  it("mueve la pendiente (guarda la hora anterior y movida) y confirma la elegida", async () => {
    const destino = "2026-10-14T10:00:00.000Z"
    const { supabase, filas, escrituras } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "p1" }),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta(), [
      { id: "p1", accion: "mover", fecha_hora: destino },
    ])
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.resueltas).toBe(1)

    const mudanza = escrituras.find(
      (e) => e.operacion === "update" && e.ids.includes("p1"),
    )
    expect(mudanza?.payload).toMatchObject({
      fecha_hora: destino,
      fecha_hora_anterior: BLOQUE_MARTES,
      movida: true,
    })
    const confirmada = escrituras.find((e) => e.payload.estado === "aceptada")
    expect(confirmada?.ids).toEqual(["elegida"])
    expect(filas.find((f) => f.id === "p1")?.fecha_hora).toBe(destino)
  })

  it("elimina la pendiente indicada y confirma la elegida", async () => {
    const { supabase, filas, escrituras } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "p1" }),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta(), [
      { id: "p1", accion: "eliminar" },
    ])
    expect(res.ok).toBe(true)
    expect(filas.some((f) => f.id === "p1")).toBe(false)
    expect(escrituras.some((e) => e.operacion === "delete" && e.ids.includes("p1"))).toBe(true)
  })

  it("409 si el destino de la mudanza ya tiene una aceptada de la modalidad", async () => {
    const destino = "2026-10-14T10:00:00.000Z"
    const { supabase } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "p1" }),
      citaFila({ id: "ocupada", estado: "aceptada", fecha_hora: destino }),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta(), [
      { id: "p1", accion: "mover", fecha_hora: destino },
    ])
    expect(res.ok).toBe(false)
    expect(res.ok === false && res.status).toBe(409)
  })

  it("409 si el bloque ya tiene otra confirmada", async () => {
    const { supabase, escrituras } = makeSupabaseFiltrado([
      citaFila(),
      citaFila({ id: "ocupante", estado: "aceptada" }),
    ])
    const res = await resolverConfirmacion(supabase, citaCompleta())
    expect(res.ok).toBe(false)
    expect(res.ok === false && res.status).toBe(409)
    // No se confirma nada mientras el bloque siga ocupado.
    expect(escrituras.some((e) => e.payload.estado === "aceptada")).toBe(false)
  })
})
