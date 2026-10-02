import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Logo } from "@/components/tonfort/logo"

describe("Logo", () => {
  it("renderiza la marca Tonfort y un svg", () => {
    const { container } = render(<Logo />)
    expect(screen.getByText("Tonfort")).toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("puede ocultar el wordmark", () => {
    const { container } = render(<Logo showWordmark={false} />)
    expect(container.textContent).not.toContain("Tonfort")
  })
})
