import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Cita } from "@/lib/supabase/types"
import { inicioSemana } from "@/lib/agenda"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/staff-client", () => ({
  getCitas: vi.fn(),
  getClientes: vi.fn(),
  getBloquesLibresProximos: vi.fn().mockResolvedValue([]),
  guardarCita: vi.fn(),
  accionCita: vi.fn(),
}))

import { getCitas, getClientes } from "@/lib/staff-client"
import GestionAgendaPage from "@/app/staff/gestion/agenda/page"

const MOD_VIRTUAL = "11111111-1111-4111-8111-111111111111"

// Lunes de la semana visible en UTC: la agenda de staff pide el rango en UTC.
function lunesSemana(): Date {
  return inicioSemana(new Date())
}

function slotDelDia(dow: number, hora: number): string {
  const lunes = lunesSemana()
  return new Date(
    Date.UTC(lunes.getUTCFullYear(), lunes.getUTCMonth(), lunes.getUTCDate() + dow, hora),
  ).toISOString()
}

// Bloque siempre en el futuro y en día laborable: el `+` se oculta en los
// bloques pasados, así que estos tests no pueden depender de un día fijo.
// Nombre accesible de una celda a partir de su ISO (mismo formato que la UI).
function regexCelda(iso: string): RegExp {
  const f = new Date(iso)
  // `formatearFechaLarga` capitaliza la primera letra: hay hacer igual.
  const bruto = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(f)
  const larga = bruto.charAt(0).toUpperCase() + bruto.slice(1)
  return new RegExp(`Bloque ${iso.slice(11, 16)} del ${larga},`)
}

function slotFuturo(hora: number, dias = 3): string {
  const base = new Date(Date.now() + dias * 86_400_000)
  const dow = base.getUTCDay()
  const salto = dow === 0 ? 1 : 0 // si cae en domingo, al lunes siguiente
  const futura = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + salto, hora),
  )
  if (futura.getTime() <= Date.now()) {
    futura.setUTCDate(futura.getUTCDate() + 1)
  }
  return futura.toISOString()
}

function citaBase(over: Partial<Cita> = {}): Cita {
  return {
    id: "cita-1",
    cliente_id: null,
    nombre_solicitante: "María Pérez",
    email: null,
    telefono: "+57 300 123 4567",
    descripcion: "una mesa",
    fecha_hora: slotDelDia(1, 10),
    duracion_minutos: 120,
    estado: "en_espera",
    origen: "web",
    movida: false,
    fecha_hora_anterior: null,
    meet_link: null,
    notas: null,
    ip: null,
    modalidad_id: MOD_VIRTUAL,
    precio_copiado: 0,
    direccion: null,
    creado_en: "2026-10-01T00:00:00.000Z",
    actualizado_en: "2026-10-01T00:00:00.000Z",
    ...over,
  }
}

const aceptada = citaBase({
  id: "cita-aceptada",
  nombre_solicitante: "Ana Aceptada",
  estado: "aceptada",
  fecha_hora: slotFuturo(10, 4),
})

// `enEspera` va en un bloque futuro: los tests del `+` necesitan que el bloque
// aún no haya pasado (el `+` se oculta en los pasados).
const enEspera = citaBase({ id: "cita-espera", fecha_hora: slotFuturo(14) })

const modalidadVirtual = {
  id: MOD_VIRTUAL,
  nombre: "Virtual",
  slug: "virtual",
  descripcion: null,
  costo: 70000,
  duracion_minutos: 90,
  activo: true,
  orden: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}

beforeEach(() => {
  vi.mocked(getClientes).mockResolvedValue([])
  vi.mocked(getCitas).mockResolvedValue({
    slots: [
      {
        fecha_hora: aceptada.fecha_hora,
        duracion_minutos: 120,
        estado: "aceptada",
        enEspera: 0,
        canceladas: 0,
        citas: [
          {
            id: aceptada.id,
            estado: "aceptada",
            movida: false,
            nombre: "Ana Aceptada",
            modalidad_id: MOD_VIRTUAL,
            esMio: false,
          },
        ],
      },
      {
        fecha_hora: enEspera.fecha_hora,
        duracion_minutos: 120,
        estado: "en_espera",
        enEspera: 1,
        canceladas: 2,
        citas: [
          {
            id: enEspera.id,
            estado: "en_espera",
            movida: false,
            nombre: "María Pérez",
            modalidad_id: MOD_VIRTUAL,
            esMio: false,
          },
        ],
      },
    ],
    citas: [aceptada, enEspera],
    modalidades: [modalidadVirtual],
  })
})

function celda(nombre: RegExp): HTMLElement {
  return screen.getByRole("button", { name: nombre }) as HTMLElement
}

describe("Agenda de staff sobre la grilla compartida", () => {
  it("muestra las horas en UTC (la grilla se calcula en UTC, no en hora local)", async () => {
    render(<GestionAgendaPage />)

    // La cita aceptada está en el bloque de las 10:00 UTC del martes. Antes de
    // la corrección se mostraba corrido 5 horas y caía en otro día de la semana.
    const contenedor = await waitFor(() =>
      celda(new RegExp(`${regexCelda(aceptada.fecha_hora).source}.*confirmada`)),
    )
    expect(contenedor).toBeInTheDocument()
    // Ninguna hora corrida a hora local.
    expect(screen.queryByText("05:00")).not.toBeInTheDocument()
    expect(screen.queryByText("03:00")).not.toBeInTheDocument()
  })

  it("la celda resume el bloque con círculos de en espera y canceladas", async () => {
    render(<GestionAgendaPage />)

    // Martes 14:00 tiene 1 en espera (María Pérez) y 2 canceladas.
    const contenedor = await waitFor(() =>
      celda(new RegExp(`${regexCelda(enEspera.fecha_hora).source}.*1 en espera, 2 canceladas`)),
    )
    expect(within(contenedor).getByText("1")).toBeInTheDocument()
    expect(within(contenedor).getByText("2")).toBeInTheDocument()
    // El nombre de la cita ya no sale en la celda: está en el detalle.
    expect(within(contenedor).queryByText("María Pérez")).not.toBeInTheDocument()
  })

  it("al hacer clic en el bloque se abre el detalle de sus citas", async () => {
    const user = userEvent.setup()
    render(<GestionAgendaPage />)

    const contenedor = await waitFor(() => celda(regexCelda(enEspera.fecha_hora)))
    await user.click(contenedor)

    const dialogo = await screen.findByRole("dialog")
    expect(within(dialogo).getByText("Detalle del bloque")).toBeInTheDocument()
    // El detalle lista cada cita del bloque con su estado y sus acciones.
    expect(within(dialogo).getByText("María Pérez")).toBeInTheDocument()
    expect(within(dialogo).getByText("En espera")).toBeInTheDocument()
    await user.click(within(dialogo).getByRole("button", { name: "Acciones de María Pérez" }))
    expect(screen.getByRole("menuitem", { name: /Confirmar/ })).toBeInTheDocument()
  })

  it("una aceptada cierra el bloque: sin `+` en su celda", async () => {
    render(<GestionAgendaPage />)

    const contenedor = await waitFor(() => celda(new RegExp(`${regexCelda(aceptada.fecha_hora).source}.*confirmada`)))
    expect(within(contenedor).queryByText("Nueva")).not.toBeInTheDocument()
  })

  it("un bloque sin aceptada conserva el `+`", async () => {
    render(<GestionAgendaPage />)

    const contenedor = await waitFor(() => celda(regexCelda(enEspera.fecha_hora)))
    expect(within(contenedor).getByText("Nueva")).toBeInTheDocument()
  })

  it("el `+` abre el formulario con el bloque de esa celda ya elegido", async () => {
    const user = userEvent.setup()
    render(<GestionAgendaPage />)

    const contenedor = await waitFor(() => celda(regexCelda(enEspera.fecha_hora)))
    await user.click(within(contenedor).getByText("Nueva"))

    // El formulario se abre en la fecha y el bloque de la celda pulsada, no en
    // "hoy" ni en otro bloque.
    const fecha = screen.getByLabelText("Fecha") as HTMLInputElement
    expect(fecha.value).toBe(enEspera.fecha_hora.slice(0, 10))
    const dialogo = screen.getByRole("dialog")
    expect(within(dialogo).getAllByText("14:00 – 16:00").length).toBeGreaterThan(0)
  })

  it("pide el rango de la semana en UTC", async () => {
    render(<GestionAgendaPage />)
    await waitFor(() => expect(vi.mocked(getCitas)).toHaveBeenCalled())

    const [desde, hasta] = vi.mocked(getCitas).mock.calls[0]
    const lunes = lunesSemana()
    expect(desde.toISOString()).toBe(lunes.toISOString())
    expect(hasta.getTime() - desde.getTime()).toBe(7 * 86_400_000)
    // El lunes del rango es realmente lunes en UTC.
    expect(desde.getUTCDay()).toBe(1)
  })

  it("las citas fuera de bloque se listan aparte, sin desaparecer", async () => {
    const fuera = citaBase({ id: "cita-fuera", nombre_solicitante: "Fuera", fecha_hora: slotDelDia(2, 21) })
    vi.mocked(getCitas).mockResolvedValue({
      slots: [
        {
          fecha_hora: fuera.fecha_hora,
          duracion_minutos: 120,
          estado: "en_espera",
          enEspera: 1,
          canceladas: 0,
          citas: [
            {
              id: fuera.id,
              estado: "en_espera",
              movida: false,
              nombre: "Fuera",
              modalidad_id: MOD_VIRTUAL,
              esMio: false,
            },
          ],
        },
      ],
      citas: [aceptada, enEspera, fuera],
      modalidades: [modalidadVirtual],
    })

    render(<GestionAgendaPage />)

    expect(await screen.findByText(/Citas fuera de bloque \(1\)/)).toBeInTheDocument()
    expect(screen.getByText("Fuera")).toBeInTheDocument()
  })
})
