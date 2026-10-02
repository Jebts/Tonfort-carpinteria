import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const setTheme = vi.fn()
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme }),
}))

import { ThemeToggle } from "@/components/tonfort/theme-toggle"

describe("ThemeToggle", () => {
  it("renderiza y cambia el tema al hacer click", async () => {
    render(<ThemeToggle />)
    const btn = await screen.findByLabelText("Cambiar a modo claro")
    btn.click()
    await waitFor(() => expect(setTheme).toHaveBeenCalledWith("light"))
  })
})
