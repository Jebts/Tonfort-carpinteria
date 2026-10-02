import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import type { Propuesta3DAnimacion } from "@/lib/supabase/types"

// Mock HTMLMediaElement methods for jsdom
beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  })
})

const mockAnimaciones: Propuesta3DAnimacion[] = [
  {
    id: "a1",
    propuesta_id: "p1",
    titulo: "Deslizamiento lateral",
    descripcion: "Apertura del cajón con movimiento suave",
    video_movimiento_url: "https://example.com/movimiento-1.mp4",
    video_accion_url: "https://example.com/accion-1.mp4",
    velocidad_normal: 1,
    velocidad_inversa: 2,
    seleccionada: false,
    orden: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "a2",
    propuesta_id: "p1",
    titulo: "Apertura completa",
    descripcion: null,
    video_movimiento_url: "https://example.com/movimiento-2.mp4",
    video_accion_url: null,
    velocidad_normal: 1,
    velocidad_inversa: 2,
    seleccionada: false,
    orden: 2,
    created_at: "",
    updated_at: "",
  },
]

describe("VideoViewer", () => {
  it("renderiza título de proyecto y nombre de producto", () => {
    render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="Proyecto Test"
        nombreproducto="Producto Test"
      />,
    )
    expect(screen.getAllByText("Proyecto Test")).toHaveLength(1)
    expect(screen.getAllByText("Producto Test")).toHaveLength(1)
  })

  it("muestra mensaje cuando no hay video global", () => {
    render(
      <VideoViewer
        video_global_url={null}
        frame_centro_ms={null}
        animaciones={[]}
        titulo_proyecto="P"
        nombreproducto="Pr"
      />,
    )
    expect(screen.getByText("No hay video configurado")).toBeInTheDocument()
  })

  it("lista animaciones como botones", () => {
    render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="P"
        nombreproducto="Pr"
      />,
    )
    expect(screen.getByText("Deslizamiento lateral")).toBeInTheDocument()
    expect(screen.getByText("Apertura completa")).toBeInTheDocument()
  })

  it("muestra botón para volver al barrido global cuando un nodo está activo", () => {
    render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="P"
        nombreproducto="Pr"
      />,
    )
    fireEvent.click(screen.getByText("Deslizamiento lateral"))
    expect(screen.getByRole("button", { name: /Volver a la vista general/i })).toBeInTheDocument()
  })

  it("renderiza el elemento video con aria-label", () => {
    render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="Proyecto Test"
        nombreproducto="Producto Test"
      />,
    )
    const video = document.querySelector("video")
    expect(video).toHaveAttribute(
      "aria-label",
      "Video de propuesta Proyecto Test — Producto Test",
    )
  })

  it("no usa controles nativos del video", () => {
    render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="P"
        nombreproducto="Pr"
      />,
    )
    const video = document.querySelector("video")
    expect(video).not.toHaveAttribute("controls")
  })

  it("coloca nodos y scrubber antes del contenido, sin superponerlos al video", () => {
    const { container } = render(
      <VideoViewer
        video_global_url="https://example.com/global.mp4"
        frame_centro_ms={15000}
        animaciones={mockAnimaciones}
        titulo_proyecto="P"
        nombreproducto="Pr"
      />,
    )

    const nodos = container.querySelector("aside")
    const scrubber = screen.getByLabelText("Barra interactiva de desplazamiento")
    const titulo = screen.getByRole("heading", { level: 1 })

    // Orden de lectura: nodos -> scrubber -> titulo
    expect(
      nodos!.compareDocumentPosition(scrubber) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      scrubber.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Ni nodos ni scrubber deben volver a posicionarse respecto al viewport
    expect(nodos!.className).not.toContain("fixed")
    expect(scrubber.parentElement!.className).not.toContain("fixed")
  })
})
