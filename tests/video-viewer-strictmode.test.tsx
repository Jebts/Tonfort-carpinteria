import { StrictMode } from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import type { Propuesta3DAnimacion } from "@/lib/supabase/types"

const GLOBAL_URL = "https://example.com/global.mp4"
const MOVIMIENTO_URL = "https://example.com/movimiento.mp4"

type State = { currentTime: number; duration: number; readyState: number; paused: boolean }
const states = new WeakMap<HTMLVideoElement, State>()

function st(video: HTMLVideoElement): State {
  let s = states.get(video)
  if (!s) {
    s = { currentTime: 0, duration: 30, readyState: 0, paused: true }
    states.set(video, s)
  }
  return s
}

/**
 * Harness de medios que replica el comportamiento real del navegador:
 * load() es asíncrono y readyState/duration solo existen tras loadedmetadata.
 * Este detalle es imprescindible: con un load() síncrono el fallo queda
 * enmascarado porque los listeners aún siguen montados.
 */
function installVideoHarness() {
  Object.defineProperty(HTMLVideoElement.prototype, "currentTime", {
    configurable: true,
    get() { return st(this).currentTime },
    set(v: number) { st(this).currentTime = v },
  })
  Object.defineProperty(HTMLVideoElement.prototype, "duration", {
    configurable: true,
    get() { return st(this).duration },
    set(v: number) { st(this).duration = v },
  })
  Object.defineProperty(HTMLVideoElement.prototype, "readyState", {
    configurable: true,
    get() { return st(this).readyState },
    set(v: number) { st(this).readyState = v },
  })
  Object.defineProperty(HTMLVideoElement.prototype, "paused", {
    configurable: true,
    get() { return st(this).paused },
    set(v: boolean) { st(this).paused = v },
  })
  Object.defineProperty(HTMLVideoElement.prototype, "src", {
    configurable: true,
    get() { return (this as HTMLVideoElement & { __src?: string }).__src ?? "" },
    set(v: string) { (this as HTMLVideoElement & { __src?: string }).__src = v },
  })

  vi.spyOn(HTMLVideoElement.prototype, "load").mockImplementation(function (this: HTMLVideoElement) {
    setTimeout(() => {
      const s = st(this)
      s.readyState = 4
      s.duration = 30
      this.dispatchEvent(new Event("loadedmetadata"))
      this.dispatchEvent(new Event("canplay"))
    }, 0)
  })
  vi.spyOn(HTMLVideoElement.prototype, "play").mockImplementation(async function (this: HTMLVideoElement) {
    st(this).paused = false
  })
  vi.spyOn(HTMLVideoElement.prototype, "pause").mockImplementation(function (this: HTMLVideoElement) {
    st(this).paused = true
  })
}

const animacion: Propuesta3DAnimacion = {
  id: "anim-1",
  propuesta_id: "propuesta-1",
  titulo: "Apertura",
  descripcion: null,
  video_movimiento_url: MOVIMIENTO_URL,
  video_accion_url: null,
  velocidad_normal: 1,
  velocidad_inversa: 2,
  seleccionada: false,
  orden: 1,
  created_at: "",
  updated_at: "",
}

async function flushMedia() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

describe("VideoViewer bajo StrictMode", () => {
  beforeEach(installVideoHarness)
  afterEach(() => vi.restoreAllMocks())

  it("posiciona el video global en el frame centro tras el doble montaje de StrictMode", async () => {
    const { container } = render(
      <StrictMode>
        <VideoViewer
          video_global_url={GLOBAL_URL}
          frame_centro_ms={12000}
          animaciones={[]}
          titulo_proyecto="P"
          nombreproducto="Prod"
        />
      </StrictMode>,
    )

    const videoA = container.querySelectorAll("video")[0]
    await flushMedia()

    // Regresión: antes de la corrección el mountedRef quedaba en false tras el
    // desmontaje simulado de StrictMode y el video se quedaba en t=0 sin metadata.
    expect(videoA.src).toBe(GLOBAL_URL)
    expect(videoA.currentTime).toBe(12)
    expect(videoA.paused).toBe(true)
  })

  it("reproduce el clip de movimiento de un nodo bajo StrictMode", async () => {
    const { container } = render(
      <StrictMode>
        <VideoViewer
          video_global_url={GLOBAL_URL}
          frame_centro_ms={12000}
          animaciones={[animacion]}
          titulo_proyecto="P"
          nombreproducto="Prod"
        />
      </StrictMode>,
    )

    await flushMedia()

    const boton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Seleccionar nodo: Apertura"]',
    )
    expect(boton).not.toBeNull()
    expect(boton?.disabled).toBe(false)

    await act(async () => {
      boton?.click()
      await new Promise((r) => setTimeout(r, 50))
    })

    const [, videoB] = Array.from(container.querySelectorAll("video"))
    await waitFor(() => expect(videoB.src).toBe(MOVIMIENTO_URL))
    await waitFor(() => expect(videoB.paused).toBe(false))
  })
})
