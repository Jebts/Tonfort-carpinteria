import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  usePathname: () => "/staff/diseno/proyectos/xxx",
  useRouter: () => ({ push: vi.fn() }),
}))

import { StaffSidebar } from "@/components/tonfort/staff-sidebar"

describe("StaffSidebar", () => {
  it("lista la sección de Cotizaciones para administradores", () => {
    render(<StaffSidebar rol="admin" />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Portafolio")).toBeInTheDocument()
    expect(screen.getByText("Usuarios")).toBeInTheDocument()
    expect(screen.getByText("Cotizaciones")).toBeInTheDocument()
    expect(screen.getByText("Cotizaciones").closest("a")).toHaveAttribute(
      "href",
      "/staff/administracion/cotizaciones",
    )
    expect(screen.queryByText("Materiales")).not.toBeInTheDocument()
    // Click Gestión to expand
    fireEvent.click(screen.getByText("Gestión"))
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Clientes")).toBeInTheDocument()
    expect(screen.getByText("Agenda")).toBeInTheDocument()
    expect(screen.getByText("Citas")).toBeInTheDocument()
    // Diseño section
    fireEvent.click(screen.getByText("Diseño"))
    const proyectos = screen.getAllByText("Proyectos")
    expect(proyectos.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Salir")).toBeInTheDocument()
  })

  it("con rol=disenador y pathname /staff/diseno/proyectos/xxx, verifica Proyectos activo", () => {
    render(<StaffSidebar rol="disenador" />)
    const proyectos = screen.getByText("Proyectos")
    expect(proyectos.className).toContain("bg-primary")
  })
})
