import { StrictMode } from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { VideoViewer } from "@/components/tonfort/video-viewer"

/**
 * Emula las dos diferencias de Safari que rompian el visor:
 *
 * 1. El seek programatico se ignora mientras no haya datos del frame actual
 *    (readyState < HAVE_CURRENT_DATA), dejando el <video> en t=0.
 * 2. Un <video> pausado y nunca reproducido no decodifica ni pinta el frame
 *    aunque este descargado: Safari ignora preload="auto" para el pintado.
 *
 * Chromium (navegador integrado) no sufre ninguna de las dos, por eso alli
 * el visor funcionaba y en Safari se quedaba negro.
 */
type State = {
  currentTime: number
  duration: number
  readyState: number
  paused: boolean
  hasPaintedFrame: boolean
}

const states = new WeakMap<HTMLVideoElement, State>()

function st(video: HTMLVideoElement): State {
  let s = states.get(video)
  if (!s) {
    s = { currentTime: 0, duration: 0, readyState: 0, paused: true, hasPaintedFrame: false }
    states.set(video, s)
  }
  return s
}

function installSafariHarness() {
  Object.defineProperty(HTMLVideoElement.prototype, "currentTime", {
    configurable: true,
    get() { return st(this).currentTime },
    set(v: number) {
      const s = st(this)
      // Safari descarta el seek si no hay datos en el frame destino.
      if (s.readyState < 2) return
      s.currentTime = v
    },
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
    const s = st(this)
    s.readyState = 0
    s.hasPaintedFrame = false
    // Fase 1: loadedmetadata con HAVE_METADATA (1). Safari aun no puede pintar.
    setTimeout(() => {
      s.duration = 30
      s.readyState = 1
      this.dispatchEvent(new Event("loadedmetadata"))
      // Fase 2: llegan los datos y se puede hacer seek y pintar.
      setTimeout(() => {
        s.readyState = 4
        this.dispatchEvent(new Event("loadeddata"))
        this.dispatchEvent(new Event("canplay"))
      }, 0)
    }, 0)
  })
  vi.spyOn(HTMLVideoElement.prototype, "play").mockImplementation(async function (this: HTMLVideoElement) {
    const s = st(this)
    s.paused = false
    // Solo al reproducir se decodifica y pinta el frame.
    s.hasPaintedFrame = true
  })
  vi.spyOn(HTMLVideoElement.prototype, "pause").mockImplementation(function (this: HTMLVideoElement) {
    st(this).paused = true
  })
}

describe("VideoViewer con comportamiento Safari", () => {
  beforeEach(installSafariHarness)
  afterEach(() => vi.restoreAllMocks())

  it("posiciona y pinta el frame centro aunque el seek inicial se descarte", async () => {
    const { container } = render(
      <StrictMode>
        <VideoViewer
          video_global_url="https://example.com/global.mp4"
          frame_centro_ms={12000}
          animaciones={[]}
          titulo_proyecto="P"
          nombreproducto="Prod"
        />
      </StrictMode>,
    )

    const videoA = container.querySelectorAll("video")[0]

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // El seek se reintenta cuando hay HAVE_CURRENT_DATA, no en loadedmetadata.
    expect(videoA.currentTime).toBe(12)
    // El frame se pintó porque hubo play() de cebado.
    expect(st(videoA).hasPaintedFrame).toBe(true)
    // Y el video global queda en reposo, sin reproduccion continua.
    expect(videoA.paused).toBe(true)
  })
})
