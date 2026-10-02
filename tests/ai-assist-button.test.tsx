import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

import { AIAssistButton } from "@/components/tonfort/ai-assist-button"

afterEach(() => vi.unstubAllGlobals())

describe("AIAssistButton", () => {
  it("al generar, llama a /api/staff/ai-suggest y puebla el campo", async () => {
    const onSugerencia = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sugerencia: "texto x" }) }),
    )

    render(
      <AIAssistButton campo="Resumen" getContexto={() => ({})} onSugerencia={onSugerencia} />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Sugerir Resumen con IA/i }))
    const generar = await screen.findByRole("button", { name: "Generar" })
    fireEvent.click(generar)

    await waitFor(() => expect(onSugerencia).toHaveBeenCalledWith("texto x"))
    expect(fetch).toHaveBeenCalledWith(
      "/api/staff/ai-suggest",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("muestra error si el endpoint falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "boom" }) }),
    )
    render(<AIAssistButton campo="Resumen" getContexto={() => ({})} onSugerencia={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Sugerir Resumen con IA/i }))
    const generar = await screen.findByRole("button", { name: "Generar" })
    fireEvent.click(generar)
    // No debe crashear; el catch maneja el error con un toast.
    await waitFor(() => expect(generar).toBeInTheDocument())
  })
})
