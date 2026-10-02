import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/components/tonfort/video-viewer", () => ({
  VideoViewer: ({
    video_global_url,
    frame_centro_ms,
    modeToggle,
  }: {
    video_global_url: string | null
    frame_centro_ms?: number | null
    modeToggle?: React.ReactNode
  }) => (
    <div data-testid="video-viewer">
      {video_global_url ? `VideoViewer rendered (frame: ${frame_centro_ms ?? "none"})` : "Sin video configurado"}
      {modeToggle && <div data-testid="mode-toggle">{modeToggle}</div>}
    </div>
  ),
}))

const mockPropuesta = {
  id: "propuesta-1",
  producto_id: "product-1",
  titulo: "Estándar",
  descripcion: "Descripción de prueba",
  video_global_url: null,
  frame_centro_ms: null,
  orden: 0,
  estado: "borrador" as const,
  link_token: null,
  link_activo: false,
  publicada_portafolio: false,
  created_at: "2026-09-15T00:00:00.000Z",
  updated_at: "2026-09-15T00:00:00.000Z",
}

const mockProps = {
  proyectoId: "project-1",
  productoId: "product-1",
  propuestaId: "propuesta-1",
  clienteNombre: "Cliente Test",
  productoNombre: "Producto Test",
  propuesta: mockPropuesta,
}

import { DisenoPropuestaDetalleClient } from "@/app/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/diseno-propuesta-detalle-client"

describe("DisenoPropuestaDetalleClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra mensaje cuando no hay video", () => {
    render(<DisenoPropuestaDetalleClient {...mockProps} />)

    expect(screen.getByText("Sin video configurado")).toBeInTheDocument()
    expect(screen.getByText(/no hay video global configurado/i)).toBeInTheDocument()
  })

  it("renderiza VideoViewer cuando hay video_global_url", () => {
    const propuestaConVideo = { ...mockPropuesta, video_global_url: "https://storage.example.com/video.mp4" }
    render(<DisenoPropuestaDetalleClient {...mockProps} propuesta={propuestaConVideo} />)

    expect(screen.getAllByText(/VideoViewer rendered/).length).toBeGreaterThanOrEqual(1)
  })

  it("pasa frame_centro_ms a VideoViewer", () => {
    const propuestaConFrame = {
      ...mockPropuesta,
      video_global_url: "https://storage.example.com/video.mp4",
      frame_centro_ms: 5000,
    }
    render(<DisenoPropuestaDetalleClient {...mockProps} propuesta={propuestaConFrame} />)

    expect(screen.getAllByText("VideoViewer rendered (frame: 5000)").length).toBeGreaterThanOrEqual(1)
  })

  it("muestra zona de subida cuando no hay video", () => {
    render(<DisenoPropuestaDetalleClient {...mockProps} />)

    expect(screen.getByText("Arrastra un archivo de video o haz clic para seleccionar")).toBeInTheDocument()
    expect(screen.getByText("Máximo 100 MB · Formatos: MP4, WebM, MOV")).toBeInTheDocument()
  })

  it("muestra video subido con botón de eliminar", async () => {
    const propuestaConVideo = { ...mockPropuesta, video_global_url: "https://storage.example.com/video.mp4" }
    render(<DisenoPropuestaDetalleClient {...mockProps} propuesta={propuestaConVideo} />)

    // Expandir la sección Video Global en el sidebar
    await fireEvent.click(screen.getByText("Video Global"))

    // Abrir el diálogo de video global
    await fireEvent.click(screen.getByRole("button", { name: /Subir\/Reemplazar/i }))

    expect(screen.getByText("Video Global Configurado")).toBeInTheDocument()
    expect(screen.getByText("Ver actual")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Eliminar video/i })).toBeInTheDocument()
  })

  it("renderiza header simplificado y título", () => {
    // Con video para que se renderice el VideoViewer y su modeToggle
    const propuestaConVideo = { ...mockPropuesta, video_global_url: "https://storage.example.com/video.mp4" }
    render(<DisenoPropuestaDetalleClient {...mockProps} propuesta={propuestaConVideo} />)

    expect(screen.getAllByText("Estándar").length).toBeGreaterThanOrEqual(1)
    // En modo edicion por defecto, el botón dice "Modo Visualizador"
    expect(screen.getByText("Modo Visualizador")).toBeInTheDocument()
  })

  it("renderiza sidebar con secciones organizadas", () => {
    render(<DisenoPropuestaDetalleClient {...mockProps} />)

    expect(screen.getByText("Editor")).toBeInTheDocument()
    expect(screen.getByText("Propuesta")).toBeInTheDocument()
    expect(screen.getByText("Video Global")).toBeInTheDocument()
    expect(screen.getByText("Nodos")).toBeInTheDocument()
    expect(screen.getByText("Visibilidad")).toBeInTheDocument()
    expect(screen.getByText("Checklist")).toBeInTheDocument()
  })

  it("renderiza controles en sidebar", () => {
    render(<DisenoPropuestaDetalleClient {...mockProps} />)

    expect(screen.getByText("Estado")).toBeInTheDocument()
    expect(screen.getByText("Editar Info")).toBeInTheDocument()
    expect(screen.getByText("Nodos")).toBeInTheDocument()
  })
})