import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { VisorLandingConAnimaciones } from "@/lib/supabase/types"

// El `VideoViewer` real manipula `<video>` y `requestAnimationFrame`; aquí se
// sustituye por un doble que cuenta cuántas veces se monta, que es justo la
// garantía del carrusel: solo la diapositiva activa existe en el DOM.
let montajes = 0
vi.mock("@/components/tonfort/video-viewer", async () => {
  const react = await import("react")
  return {
    VideoViewer: ({
      titulo_proyecto,
      onVideoListo,
    }: {
      titulo_proyecto: string
      onVideoListo?: () => void
    }) => {
      montajes += 1
      // El video real avisa cuando ya tiene su frame centro decodificado; sin
      // ese aviso el carrusel mantendría la diapositiva entrante oculta.
      react.useEffect(() => {
        onVideoListo?.()
      }, [onVideoListo])
      return <div data-testid="video-viewer">{titulo_proyecto}</div>
    },
  }
})

import { VisoresCarousel } from "@/components/tonfort/landing/visor-carousel"

function visor(over: Partial<VisorLandingConAnimaciones> = {}): VisorLandingConAnimaciones {
  return {
    id: "v1",
    slot: null,
    eyebrow: null,
    titulo: "Closet",
    descripcion: null,
    video_global_url: "https://h/global.mp4",
    frame_centro_ms: 0,
    activo: true,
    orden: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    animaciones: [],
    ...over,
  }
}

/**
 * Durante el cruce hay dos diapositivas montadas a propósito (la saliente tapa
 * el hueco mientras la entrante decodifica), así que los tests leen siempre la
 * activa, que es la marcada con `data-activa`.
 */
function visorActivo(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-activa="true"] [data-testid="video-viewer"]')
}

describe("VisoresCarousel", () => {
  it("no renderiza nada sin visores con video", () => {
    const { container } = render(<VisoresCarousel visores={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("descarta los visores sin video global", () => {
    const { container } = render(
      <VisoresCarousel visores={[visor({ video_global_url: "" })]} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("monta un solo VideoViewer con N visores", () => {
    montajes = 0
    render(<VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />)
    expect(screen.getAllByTestId("video-viewer")).toHaveLength(1)
    expect(montajes).toBe(1)
  })

  it("las flechas cambian de visor y solo entonces se monta el siguiente", async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <VisoresCarousel
        visores={[visor(), visor({ id: "v2", titulo: "Cocina" }), visor({ id: "v3", titulo: "Closet alto" })]}
      />,
    )

    expect(visorActivo(container)).toHaveTextContent("Closet")

    await usuario.click(screen.getByLabelText("Visor siguiente"))
    expect(visorActivo(container)).toHaveTextContent("Cocina")

    await usuario.click(screen.getByLabelText("Visor anterior"))
    expect(visorActivo(container)).toHaveTextContent("Closet")
  })

  it("da la vuelta al último con la flecha derecha", async () => {
    const usuario = userEvent.setup()
    const { container } = render(<VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />)

    await usuario.click(screen.getByLabelText("Visor siguiente"))
    await usuario.click(screen.getByLabelText("Visor siguiente"))
    expect(visorActivo(container)).toHaveTextContent("Closet")
  })

  it("los puntos indicadores saltan a su diapositiva", async () => {
    const usuario = userEvent.setup()
    const { container } = render(<VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />)

    await usuario.click(screen.getByLabelText("Ir al visor 2: Cocina"))
    expect(visorActivo(container)).toHaveTextContent("Cocina")
  })

  it("navega con ← y → sobre la sección", async () => {
    const usuario = userEvent.setup()
    const { container } = render(<VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />)

    const seccion = screen.getByRole("region", { name: "Mira cómo se presentan los diseños." })
    await usuario.click(seccion)
    await usuario.keyboard("{ArrowRight}")
    expect(visorActivo(container)).toHaveTextContent("Cocina")
  })

  it("deshabilita las flechas cuando hay un solo visor", () => {
    render(<VisoresCarousel visores={[visor()]} />)
    expect(screen.getByLabelText("Visor siguiente")).toBeDisabled()
    expect(screen.getByLabelText("Visor anterior")).toBeDisabled()
  })

  // La animación de desplazamiento se aplica al contenedor y cambia de sentido
  // según se navegue hacia delante o hacia atrás.
  it("aplica la animación de entrada según la dirección de navegación", async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />,
    )

    const contenedor = () => container.querySelector(".tonfort-visor-next, .tonfort-visor-prev")

    expect(contenedor()).toHaveClass("tonfort-visor-next")

    await usuario.click(screen.getByLabelText("Visor siguiente"))
    expect(contenedor()).toHaveClass("tonfort-visor-next")
    expect(visorActivo(container)).toHaveTextContent("Cocina")

    await usuario.click(screen.getByLabelText("Visor anterior"))
    expect(contenedor()).toHaveClass("tonfort-visor-prev")
    expect(visorActivo(container)).toHaveTextContent("Closet")
  })

  // La diapositiva entrante no se muestra hasta que su video está listo: es lo
  // que evita el rectángulo negro durante el cruce.
  it("mantiene oculta la diapositiva entrante hasta que su video está listo", async () => {
    const usuario = userEvent.setup()
    const { container } = render(
      <VisoresCarousel visores={[visor(), visor({ id: "v2", titulo: "Cocina" })]} />,
    )

    await usuario.click(screen.getByLabelText("Visor siguiente"))

    // Sigue habiendo dos capas: la saliente aún visible y la entrante ya activa.
    const capas = container.querySelectorAll("[data-testid='video-viewer']")
    expect(capas.length).toBeGreaterThan(1)
    expect(container.querySelector('[data-activa="true"]')).not.toBeNull()
    expect(visorActivo(container)).toHaveTextContent("Cocina")
  })
})