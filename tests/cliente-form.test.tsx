import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

// eslint-disable-next-line import/first
import { ClienteForm } from "@/components/tonfort/staff/cliente-form"
// eslint-disable-next-line import/first
import type { Cliente } from "@/lib/supabase/types"

function clienteBase(): Cliente {
  return {
    id: "",
    nombre: "",
    email: null,
    telefono: null,
    fase: "descubrimiento",
    info_personal: {},
    descripcion_proyecto: null,
    creado_en: "",
    actualizado_en: "",
  }
}

describe("ClienteForm", () => {
  it("al enviar llama onSave con info_personal.ciudad y fase por defecto", async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(<ClienteForm cliente={clienteBase()} onCancel={onCancel} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Ana" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@x.com" },
    })
    fireEvent.change(screen.getByLabelText("Ciudad / info personal"), {
      target: { value: "Bogotá" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))

    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({
      nombre: "Ana",
      email: "ana@x.com",
      fase: "descubrimiento",
    })
    expect((payload.info_personal as { ciudad?: string }).ciudad).toBe("Bogotá")
  })
})
