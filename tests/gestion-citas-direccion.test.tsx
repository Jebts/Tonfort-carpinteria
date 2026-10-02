import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Cita, Cliente } from "@/lib/supabase/types"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}))

vi.mock("@/lib/staff-client", () => ({
  getCitas: vi.fn(),
  guardarCita: vi.fn(),
  accionCita: vi.fn(),
  getClientes: vi.fn(),
}))

import { getCitas, guardarCita, getClientes } from "@/lib/staff-client"
import GestionCitasPage from "@/app/staff/gestion/citas/page"

function citacion(over: Partial<Cita> = {}): Cita {
  return {
    id: "cita-1",
    cliente_id: null,
    nombre_solicitante: "María Pérez",
    email: null,
    telefono: "+57 300 123 4567",
    descripcion: null,
    fecha_hora: "2026-10-10T10:00:00.000Z",
    duracion_minutos: 120,
    estado: "en_espera",
    origen: "web",
    movida: false,
    fecha_hora_anterior: null,
    meet_link: null,
    notas: null,
    ip: null,
    modalidad_id: null,
    precio_copiado: 70000,
    direccion: "Cra 10 # 20-30, Bogotá",
    creado_en: "2026-10-01T00:00:00.000Z",
    actualizado_en: "2026-10-01T00:00:00.000Z",
    ...over,
  }
}

const cita = citacion()

describe("GestionCitasPage — dirección de cita presencial", () => {
  beforeEach(() => {
    vi.mocked(getCitas).mockResolvedValue({ slots: [], citas: [cita] })
    vi.mocked(getClientes).mockResolvedValue([] as Cliente[])
    vi.mocked(guardarCita).mockResolvedValue(cita)
  })

  it("renderiza el campo dirección en el formulario de nueva cita", async () => {
    const user = userEvent.setup()
    render(<GestionCitasPage />)

    await user.click(screen.getByRole("button", { name: /Nueva cita/i }))

    expect(screen.getByLabelText("Dirección de la visita")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Ej. Cra 10 # 20-30, Bogotá"),
    ).toBeInTheDocument()
  })

  it("carga el valor existente de dirección al abrir el detalle de edición", async () => {
    const user = userEvent.setup()
    render(<GestionCitasPage />)

    await screen.findByText("María Pérez")
    const fila = screen.getByText("María Pérez").closest("tr")!
    await user.click(within(fila).getByRole("button"))
    await user.click(screen.getByRole("menuitem", { name: /Editar/i }))

    const input = await screen.findByLabelText("Dirección de la visita")
    expect(input).toHaveValue("Cra 10 # 20-30, Bogotá")
  })

  it("envía la dirección en el PATCH al guardar cambios", async () => {
    const user = userEvent.setup()
    render(<GestionCitasPage />)

    await screen.findByText("María Pérez")
    const fila = screen.getByText("María Pérez").closest("tr")!
    await user.click(within(fila).getByRole("button"))
    await user.click(screen.getByRole("menuitem", { name: /Editar/i }))

    const input = await screen.findByLabelText("Dirección de la visita")
    await user.clear(input)
    await user.type(input, "Cra 90 # 1-2, Medellín")
    await user.click(screen.getByRole("button", { name: /Guardar cambios/i }))

    await waitFor(() => expect(guardarCita).toHaveBeenCalledTimes(1))
    expect(guardarCita).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cita-1",
        direccion: "Cra 90 # 1-2, Medellín",
      }),
    )
  })
})
