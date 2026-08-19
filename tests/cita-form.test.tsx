import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("@/lib/staff-client", () => ({
  getClientes: vi.fn(() => Promise.resolve([])),
  guardarCliente: vi.fn(() => Promise.resolve({ id: "nuevo-cliente-id" })),
}))

// eslint-disable-next-line import/first
import { CitaForm } from "@/components/tonfort/staff/cita-form"

describe("CitaForm", () => {
  it("al enviar llama onSave con payload interno por defecto", async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(<CitaForm onCancel={onCancel} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Juan" },
    })
    const fecha = "2026-08-20T10:00"
    fireEvent.change(screen.getByLabelText("Fecha y hora"), {
      target: { value: fecha },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))

    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({
      nombre_solicitante: "Juan",
      email: null,
      telefono: null,
      descripcion: null,
      origen: "interna",
      estado: "en_espera",
    })
    expect(payload.fecha_hora).toBe(new Date(fecha).toISOString())
  })
})
