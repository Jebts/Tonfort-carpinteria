import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { RefObject } from "react"
import { useViewerSequence } from "@/hooks/use-viewer-sequence"
import type { AnimacionVisor } from "@/lib/supabase/types"

// jsdom no reproduce video: mockeamos lo que el hook toca.
function makeVideo() {
  const listeners = new Map<string, Set<() => void>>()
  const video = {
    paused: false,
    muted: false,
    loop: false,
    autoplay: false,
    playsInline: false,
    preload: "",
    src: "",
    playbackRate: 1,
    readyState: 0,
    currentTime: 0,
    duration: 0,
    error: null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn((type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    }),
    removeEventListener: vi.fn((type: string, fn: () => void) => {
      listeners.get(type)?.delete(fn)
    }),
    // Dispara los listeners que el hook registró (simula metadata/carga).
    fire: (type: string) => {
      for (const fn of Array.from(listeners.get(type) ?? [])) fn()
    },
  }
  return video
}

let rafCallbacks: FrameRequestCallback[] = []

beforeEach(() => {
  rafCallbacks = []
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })
  vi.stubGlobal("cancelAnimationFrame", () => {})
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLVideoElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  })
})

function makeRefs() {
  const videoA = makeVideo()
  const videoB = makeVideo()
  const videoRef = { current: videoA } as unknown as RefObject<HTMLVideoElement | null>
  const videoRefB = { current: videoB } as unknown as RefObject<HTMLVideoElement | null>
  return { videoRef, videoRefB, videoA, videoB }
}

function animacion(over: Partial<AnimacionVisor> = {}): AnimacionVisor {
  return {
    id: "a1",
    titulo: "Apertura",
    descripcion: null,
    video_movimiento_url: "https://h/mov.mp4",
    video_accion_url: "https://h/acc.mp4",
    ...over,
  }
}

describe("useViewerSequence", () => {
  it("estado inicial: GLOBAL en el slot A, pausado en el frame centro", () => {
    const { videoRef, videoRefB } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: "https://h/global.mp4",
        frameCentroMs: 4000,
      }),
    )

    expect(result.current.state).toBe("GLOBAL")
    expect(result.current.activeSlot).toBe("A")
    expect(result.current.currentTimeMs).toBe(4000)
    expect(result.current.isLocked).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.activeAnimacion).toBeNull()
  })

  it("sin frameCentroMs el tiempo inicial es 0", () => {
    const { videoRef, videoRefB } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: null,
        frameCentroMs: null,
      }),
    )
    expect(result.current.currentTimeMs).toBe(0)
  })

  it("scrubTo avanza y rebobina el tiempo dentro del rango", () => {
    const { videoRef, videoRefB, videoA } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: null,
        frameCentroMs: 0,
      }),
    )

    act(() => {
      result.current.scrubTo(5000)
    })
    expect(result.current.currentTimeMs).toBe(5000)
    expect(videoA.currentTime).toBe(5)

    // Negativo se corta en 0.
    act(() => {
      result.current.scrubTo(-100)
    })
    expect(result.current.currentTimeMs).toBe(0)
    expect(videoA.currentTime).toBe(0)
  })

  it("preloadSlot precarga el slot inactivo y shouldIgnoreMediaError lo absorbe", () => {
    const { videoRef, videoRefB, videoB } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: "https://h/global.mp4",
        frameCentroMs: 1000,
      }),
    )

    // El slot activo es A → el inactivo (y por tanto el de precarga) es B.
    act(() => {
      result.current.preloadSlot("https://h/accion.mp4")
    })

    expect(videoB.src).toBe("https://h/accion.mp4")
    expect(videoB.load).toHaveBeenCalled()
    // El error de una precarga especulativa no se le muestra al usuario.
    expect(
      result.current.shouldIgnoreMediaError(videoB as unknown as HTMLVideoElement),
    ).toBe(true)
    // El slot activo (A) no está precargando: su error sí se muestra.
    expect(result.current.shouldIgnoreMediaError(videoRef.current)).toBe(false)
    // Elemento nulo → nunca se ignora.
    expect(result.current.shouldIgnoreMediaError(null)).toBe(false)
  })

  it("cancelTransitions desbloquea y pausa", () => {
    const { videoRef, videoRefB, videoA, videoB } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: "https://h/global.mp4",
        frameCentroMs: 1000,
      }),
    )

    act(() => {
      result.current.cancelTransitions()
    })
    expect(result.current.isLocked).toBe(false)
    expect(videoA.pause).toHaveBeenCalled()
    expect(videoB.pause).toHaveBeenCalled()
  })

  it("setError expone el error al componente", () => {
    const { videoRef, videoRefB } = makeRefs()
    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: null,
        frameCentroMs: null,
      }),
    )

    act(() => {
      result.current.setError("No se pudo cargar el video")
    })
    expect(result.current.error).toBe("No se pudo cargar el video")

    act(() => {
      result.current.setError(null)
    })
    expect(result.current.error).toBeNull()
  })

  it("snapToMagnet en GLOBAL devuelve al frame centro", () => {
    const { videoRef, videoRefB, videoA } = makeRefs()
    // Reloj controlado: la animación del imán mide el tiempo con
    // performance.now(), así que el bucle de frames debe avanzar el reloj.
    let clock = 0
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => clock)

    const { result } = renderHook(() =>
      useViewerSequence({
        videoRef,
        videoRefB,
        videoGlobalUrl: "https://h/global.mp4",
        frameCentroMs: 3000,
      }),
    )

    // El hook ya registró loadedmetadata al montar: le damos la duración
    // real del global (10s) para que getCenterMs use el frame centro (3000ms).
    videoA.duration = 10
    act(() => {
      videoA.fire("loadedmetadata")
    })

    // Nos alejamos del imán para simular un scrub.
    act(() => {
      result.current.scrubTo(9000)
    })
    expect(result.current.currentTimeMs).toBe(9000)

    // Ejecutamos la animación del imán hasta completarla.
    act(() => {
      result.current.snapToMagnet()
      let guard = 0
      while (rafCallbacks.length > 0 && guard < 1000) {
        clock += 16 // ~un frame
        const callbacks = rafCallbacks
        rafCallbacks = []
        for (const cb of callbacks) cb(clock)
        guard++
      }
    })

    expect(result.current.currentTimeMs).toBe(3000)
    expect(videoA.currentTime).toBe(3)
    nowSpy.mockRestore()
  })
})
