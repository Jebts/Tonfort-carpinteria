import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  SelectorModalidad,
  type ModalidadOpcion,
} from "@/components/tonfort/agenda/selector-modalidad"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

beforeEach(() => {
  push.mockReset()
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  })
})

const opciones: ModalidadOpcion[] = [
  {
    id: "mod-virtual",
    slug: "virtual",
    nombre: "Virtual",
    descripcion: null,
    costo: 0,
    duracion_minutos: 90,
    bullets: ["Sin costo y desde donde estés"],
    icono: "laptop",
  },
  {
    id: "mod-presencial",
    slug: "presencial",
    nombre: "Presencial",
    descripcion: "Visita a domicilio",
    costo: 70000,
    duracion_minutos: 120,
    bullets: ["Toma de medidas"],
    icono: "map",
    etiqueta: "Recomendada",
  },
]

describe("SelectorModalidad", () => {
  it("renderiza el video explicativo y las dos opciones", () => {
    render(<SelectorModalidad opciones={opciones} />)
    expect(
      screen.getByLabelText(
        "Qué es una cita virtual y qué es una visita presencial",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Virtual")).toBeInTheDocument()
    expect(screen.getByText("Presencial")).toBeInTheDocument()
    // Precio y duración vienen del catálogo de modalidades.
    // es-CO formata COP como "$ 70.000" (con espacio de no ruptura,
    // que testing-library normaliza a espacio simple).
    expect(screen.getByText("Gratis · 90 min")).toBeInTheDocument()
    expect(screen.getByText("$ 70.000 · 120 min")).toBeInTheDocument()
  })

  it("muestra la etiqueta solo mientras la opción no está elegida", () => {
    render(<SelectorModalidad opciones={opciones} />)
    expect(screen.getByText("Recomendada")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Presencial"))
    expect(screen.queryByText("Recomendada")).not.toBeInTheDocument()
  })

  it("Continuar deshabilitado mientras no haya elección", () => {
    render(<SelectorModalidad opciones={opciones} />)
    expect(
      screen.getByRole("button", { name: /Continuar/i }),
    ).toBeDisabled()
  })

  it("al elegir y continuar navega a /agenda/horario con la modalidad", () => {
    render(<SelectorModalidad opciones={opciones} />)
    fireEvent.click(screen.getByText("Presencial"))
    const continuar = screen.getByRole("button", { name: /Continuar/i })
    expect(continuar).not.toBeDisabled()
    fireEvent.click(continuar)
    expect(push).toHaveBeenCalledWith("/agenda/horario?modalidad=presencial")
  })

  it("marca aria-pressed solo en la opción elegida", () => {
    render(<SelectorModalidad opciones={opciones} />)
    const virtual = screen.getByText("Virtual").closest("button")
    const presencial = screen.getByText("Presencial").closest("button")
    expect(virtual).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(virtual as HTMLElement)
    expect(virtual).toHaveAttribute("aria-pressed", "true")
    expect(presencial).toHaveAttribute("aria-pressed", "false")
  })
})
