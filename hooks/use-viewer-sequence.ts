"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { AnimacionVisor } from "@/lib/supabase/types"

export type ViewerState =
  | "GLOBAL"
  | "MOVIMIENTO"
  | "ACCION"
  | "ACCION_FIN"
  | "REVERSA"

export interface ViewerSequenceConfig {
  videoRef: RefObject<HTMLVideoElement | null>
  videoRefB?: RefObject<HTMLVideoElement | null>
  videoGlobalUrl: string | null
  frameCentroMs: number | null
  velocidadNormal?: number
  velocidadInversa?: number
  /**
   * Avisa cuando el video global ya está decodificado y colocado en el frame
   * centro. El carrusel lo usa para no iniciar la entrada de una diapositiva
   * sobre un rectángulo negro, que es lo que provoca el parpadeo.
   */
  onVideoGlobalListo?: () => void
}

export interface ViewerSequenceReturn {
  state: ViewerState
  activeSlot: "A" | "B"
  currentTimeMs: number
  durationMs: number
  isLocked: boolean
  error: string | null
  activeAnimacion: AnimacionVisor | null
  selectAnimacion: (animacion: AnimacionVisor) => void
  reverseToGlobal: () => void
  scrubTo: (timeMs: number) => void
  snapToMagnet: () => void
  setError: (error: string | null) => void
  cancelTransitions: () => void
  preloadSlot: (url: string | null | undefined, level?: "auto" | "metadata") => void
  shouldIgnoreMediaError: (element: HTMLVideoElement | null) => boolean
}

const MS_PER_SEC = 1000
// Duración base del imán (frame centro del global, frame final de la acción).
// La acción lo multiplica por velocidadInversa para ir más despacio.
const MAGNET_DURATION_MS = 600

function pauseVideo(video: HTMLVideoElement | null) {
  if (!video || video.paused) return
  video.pause()
}

export function useViewerSequence(
  config: ViewerSequenceConfig,
): ViewerSequenceReturn {
  const {
    videoRef,
    videoRefB,
    videoGlobalUrl,
    frameCentroMs,
    velocidadNormal = 1,
    velocidadInversa = 2,
    onVideoGlobalListo,
  } = config

  const [state, setState] = useState<ViewerState>("GLOBAL")
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A")
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(frameCentroMs ?? 0)
  const [durationMs, setDurationMs] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAnimacion, setActiveAnimacion] = useState<AnimacionVisor | null>(null)

  const activeAnimacionRef = useRef<AnimacionVisor | null>(null)
  const pendingAnimacionRef = useRef<AnimacionVisor | null>(null)
  const mountedRef = useRef(true)
  const stateRef = useRef<ViewerState>("GLOBAL")
  stateRef.current = state

  const activeSlotRef = useRef<"A" | "B">("A")
  activeSlotRef.current = activeSlot

  const durationMsRef = useRef<number>(0)
  durationMsRef.current = durationMs
  const globalDurationMsRef = useRef<number>(0)
  const globalSlotRef = useRef<"A" | "B">("A")
  const animationRafRef = useRef<number | null>(null)
  const timeRafRef = useRef<number | null>(null)
  const transitionCleanupRef = useRef<(() => void) | null>(null)
  // URL cargada actualmente en cada elemento. Permite no reiniciar el elemento si
  // la URL ya esta puesta, evitando el round-trip de red y decodificacion.
  const slotUrlRef = useRef<Record<"A" | "B", string | null>>({ A: null, B: null })
  // Slot que esta ejecutando una transicion: no se puede precalentar encima.
  const transitionSlotRef = useRef<"A" | "B" | null>(null)
  // Slot con una precarga especulativa en vuelo. Un fallo de red aqui no se le
  // enseña al usuario: el clip se pedira bajo demanda cuando haga falta.
  const preloadSlotRef = useRef<"A" | "B" | null>(null)
  // Ultimo frame del clip de accion, en ms. Fuente de verdad del iman en ACCION_FIN:
  // se toma de video.duration en el evento "ended" y no de durationMs, que puede
  // quedar desfasado respecto al elemento.
  const accionEndMsRef = useRef<number>(0)

  const getVideo = useCallback((slot?: "A" | "B"): HTMLVideoElement | null => {
    const targetSlot = slot ?? activeSlotRef.current
    if (targetSlot === "B" && videoRefB?.current) {
      return videoRefB.current
    }
    return videoRef?.current ?? null
  }, [videoRef, videoRefB])

  const getInactiveSlot = useCallback((): "A" | "B" => {
    return activeSlotRef.current === "A" ? "B" : "A"
  }, [])

  // Precarga silenciosa en el slot inactivo. No toca activeSlot, no pausa nada
  // visible y no dispara transiciones: solo deja el elemento con la fuente puesta
  // y descargando para que el cambio de slot posterior sea practicamente inmediato.
  //
  // `level: "metadata"` solo pide cabecera y primer frame en vez del archivo
  // entero. Es lo que corresponde a precargas especulativas (p. ej. el clip de
  // movimiento mientras el usuario inspecciona el final de la accion): el
  // navegador no arrastra un mp4 completo que igual no se va a ver, y una
  // descarga de mucho menos peso es mucho menos propensa a caerse. Con la
  // duración y el primer frame disponibles, loadVideo sigue resolviendo por la
  // vía rápida de «misma URL».
  const preloadSlot = useCallback(
    (url: string | null | undefined, level: "auto" | "metadata" = "auto") => {
      if (!url || !mountedRef.current) return
      const slot = getInactiveSlot()
      if (transitionSlotRef.current === slot) return
      if (slotUrlRef.current[slot] === url) return

      const video = getVideo(slot)
      if (!video) return

      // Una precarga es especulativa: si la descarga se cae, el clip no se necesita
      // hasta que el usuario pulse «volver», y entonces se cargara bajo demanda con
      // su propio manejador de error. Aqui solo se marca el slot como «precargando»
      // para que shouldIgnoreMediaError() absorba el fallo y no se le muestre al
      // usuario un «No se pudo cargar el video» mientras sigue viendo la accion.
      // No se puede parar la propagacion del evento: React enlaza onError
      // directamente en el elemento (los eventos de medios no se propagan), asi
      // que stopPropagation no lo alcanzaria.
      const onPreloadError = () => {
        video.removeEventListener("error", onPreloadError)
        if (preloadSlotRef.current !== slot) return
        preloadSlotRef.current = null
        // Se olvida la URL para que el proximo loadVideo real la reintente.
        if (slotUrlRef.current[slot] === url) {
          slotUrlRef.current[slot] = null
        }
      }
      video.addEventListener("error", onPreloadError)
      preloadSlotRef.current = slot

      slotUrlRef.current[slot] = url
      video.loop = false
      video.autoplay = false
      video.muted = true
      video.playsInline = true
      video.preload = level
      video.src = url
      video.load()
    },
    [getInactiveSlot, getVideo],
  )

  // true cuando el error de un elemento es de una precarga especulativa y no de
  // una carga que el usuario esta viendo. El componente lo consulta en su onError.
  const shouldIgnoreMediaError = useCallback(
    (element: HTMLVideoElement | null) => {
      if (!element) return false
      const slot: "A" | "B" = element === videoRefB?.current ? "B" : "A"
      // Si hay una transicion en curso sobre ese slot, el error es de una carga
      // real y debe mostrarse como siempre.
      if (transitionSlotRef.current === slot) return false
      return preloadSlotRef.current === slot
    },
    [videoRef, videoRefB],
  )

  // Debe declararse ANTES de cualquier efecto que cargue video. En StrictMode
  // React monta -> desmonta -> remonta: el cleanup lo deja en false y, si no se
  // restaura aqui, loadVideo() aborta en el segundo montaje y ningun video carga.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      pauseVideo(videoRef.current)
      pauseVideo(videoRefB?.current ?? null)
    }
  }, [videoRef, videoRefB])

  const getCenterMs = useCallback(
    (duration: number) => {
      if (duration <= 0) return 0
      const configuredCenter =
        frameCentroMs !== null &&
        Number.isFinite(frameCentroMs) &&
        frameCentroMs >= 0
          ? frameCentroMs
          : null

      if (configuredCenter !== null) {
        return Math.min(configuredCenter, duration)
      }

      return Math.round(duration / 2)
    },
    [frameCentroMs],
  )

  const cancelAnimation = useCallback(() => {
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current)
      animationRafRef.current = null
    }
  }, [])

  const clearTransitionWork = useCallback(() => {
    cancelAnimation()
    transitionCleanupRef.current?.()
    transitionCleanupRef.current = null
  }, [cancelAnimation])

  const cancelTransitions = useCallback(() => {
    clearTransitionWork()
    pauseVideo(videoRef.current)
    pauseVideo(videoRefB?.current ?? null)
    setIsLocked(false)
  }, [clearTransitionWork, videoRef, videoRefB])

  const appendTransitionCleanup = useCallback((cleanup: () => void) => {
    const previousCleanup = transitionCleanupRef.current
    let cleaned = false

    transitionCleanupRef.current = () => {
      if (cleaned) return
      cleaned = true
      previousCleanup?.()
      cleanup()
    }
  }, [])

  const handleSlotChange = useCallback(
    (newSlot: "A" | "B", isGlobal = false) => {
      if (!mountedRef.current) return

      setActiveSlot(newSlot)
      activeSlotRef.current = newSlot
      if (isGlobal) {
        globalSlotRef.current = newSlot
      }

      const newVideo = newSlot === "A" ? videoRef.current : videoRefB?.current ?? null
      if (!newVideo) return

      const measuredDuration =
        Number.isFinite(newVideo.duration) && newVideo.duration > 0
          ? Math.round(newVideo.duration * MS_PER_SEC)
          : 0
      const nextDuration = isGlobal
        ? measuredDuration || globalDurationMsRef.current
        : measuredDuration || durationMsRef.current
      const currentTime = Number.isFinite(newVideo.currentTime)
        ? Math.max(0, Math.round(newVideo.currentTime * MS_PER_SEC))
        : 0

      if (isGlobal && measuredDuration > 0) {
        globalDurationMsRef.current = measuredDuration
      }
      setDurationMs(nextDuration)
      setCurrentTimeMs(currentTime)
    }, [videoRef, videoRefB])

  const loadVideo = useCallback(
    (
      slot: "A" | "B",
      url: string,
      startTimeMs: number,
      onReady: (video: HTMLVideoElement, slot: "A" | "B") => void,
      isGlobal: boolean,
    ) => {
      if (!mountedRef.current) return

      const video = getVideo(slot)
      if (!video) return

      clearTransitionWork()
      pauseVideo(video)
      video.loop = isGlobal
      video.autoplay = false
      video.muted = true
      video.playsInline = true
      video.preload = "auto"

      let cleaned = false
      let finished = false
      let metadataReady = false
      let seekConfirmed = false
      let swapped = false
      let seekAttempts = 0
      let targetSec = 0
      let primed = false
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let frameTimeoutId: ReturnType<typeof setTimeout> | null = null
      let onFrameReady: (() => void) | null = null

      const MAX_SEEK_ATTEMPTS = 5
      const FRAME_WAIT_TIMEOUT_MS = 150

      const currentVideo = video
      // Video que se mantiene visible como fallback mientras el nuevo decodifica
      // su primer frame. Nunca es el mismo elemento que se esta cargando.
      const fallbackVideo =
        slot === "A" ? videoRefB?.current ?? null : videoRef.current ?? null

      const removeListeners = () => {
        currentVideo.removeEventListener("loadedmetadata", onLoadedMetadata)
        currentVideo.removeEventListener("loadeddata", onLoadedData)
        currentVideo.removeEventListener("canplay", onCanPlay)
        currentVideo.removeEventListener("seeked", onSeeked)
        currentVideo.removeEventListener("error", onError)
        if (onFrameReady) {
          currentVideo.removeEventListener("canplay", onFrameReady)
          currentVideo.removeEventListener("canplaythrough", onFrameReady)
          currentVideo.removeEventListener("loadeddata", onFrameReady)
          onFrameReady = null
        }
      }

      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        if (frameTimeoutId !== null) {
          clearTimeout(frameTimeoutId)
          frameTimeoutId = null
        }
        removeListeners()
        if (transitionCleanupRef.current === cleanup) {
          transitionCleanupRef.current = null
        }
        if (transitionSlotRef.current === slot) {
          transitionSlotRef.current = null
        }
      }

      const targetOk = () => {
        return Math.abs(currentVideo.currentTime - targetSec) <= 0.05
      }

      const doSeek = () => {
        currentVideo.currentTime = targetSec
      }

      // Corte atomico: el slot cambia y el video saliente se pausa en el mismo tick,
      // de modo que nunca queda una ventana con el contenedor negro al descubierto.
      // NO se pausa currentVideo: onReady puede acaba de llamar a play() y pausarlo
      // aqui mataria la reproduccion (el frame ya esta decodificado, no hay negro).
      const commitSwap = () => {
        if (swapped || !mountedRef.current) return
        swapped = true
        cleanup()
        onReady(currentVideo, slot)
        pauseVideo(fallbackVideo)
      }

      const settle = () => {
        if (finished || !mountedRef.current) return
        finished = true

        // NO se pausa aqui: el video entrante se mantiene pausado y el saliente
        // sigue visible como fallback hasta que el entrante tenga frame.
        if (isGlobal && !primed) {
          primed = true
          const playPromise = currentVideo.play()
          if (playPromise && typeof playPromise.then === "function") {
            playPromise
              .then(() => {
                currentVideo.pause()
                // El play() de priming puede haber avanzado unos frames. Se restaura
                // siempre el frame objetivo, ya sea reintentando el seek o forzandolo.
                if (!targetOk() && seekAttempts < MAX_SEEK_ATTEMPTS) {
                  seekAttempts++
                  doSeek()
                } else if (!targetOk()) {
                  currentVideo.currentTime = targetSec
                }
              })
              .catch(() => {})
          }
        }

        // Corte instantaneo: el slot solo cambia cuando el video entrante ya tiene
        // un frame decodificado. Hasta entonces el saliente sigue visible, asi que
        // nunca se ve el fondo negro del contenedor.
        // readyState 2 = HAVE_CURRENT_DATA (ya hay frame en currentTime),
        // readyState 3 = HAVE_FUTURE_DATA (puede reproducir sin rebobinar).
        if (currentVideo.readyState >= 2) {
          commitSwap()
          return
        }

        onFrameReady = () => {
          commitSwap()
        }
        frameTimeoutId = setTimeout(() => {
          commitSwap()
        }, FRAME_WAIT_TIMEOUT_MS)
        currentVideo.addEventListener("canplay", onFrameReady)
        currentVideo.addEventListener("canplaythrough", onFrameReady)
        currentVideo.addEventListener("loadeddata", onFrameReady)
      }

      const applyTarget = () => {
        if (finished || !metadataReady || seekConfirmed) return
        if (currentVideo.readyState < 2) return

        if (!targetOk()) {
          if (seekAttempts < MAX_SEEK_ATTEMPTS) {
            seekAttempts++
            doSeek()
          }
          if (targetOk()) {
            seekConfirmed = true
            settle()
          }
        } else {
          seekConfirmed = true
          settle()
        }
      }

      const onLoadedMetadata = () => {
        if (finished) return

        const duration =
          Number.isFinite(currentVideo.duration) && currentVideo.duration > 0
            ? Math.round(currentVideo.duration * MS_PER_SEC)
            : 0
        if (!duration) return

        metadataReady = true
        if (isGlobal) {
          globalDurationMsRef.current = duration
        }

        const targetMs = isGlobal ? getCenterMs(duration) : Math.max(0, startTimeMs)
        targetSec = Math.min(targetMs, duration) / MS_PER_SEC
        applyTarget()

        if (!seekConfirmed && timeoutId === null) {
          timeoutId = setTimeout(() => {
            if (!finished && mountedRef.current) {
              settle()
            }
          }, 3000)
        }
      }

      const onLoadedData = () => {
        applyTarget()
      }

      const onCanPlay = () => {
        applyTarget()
      }

      const onSeeked = () => {
        if (finished || !metadataReady) return
        if (targetOk()) {
          if (!seekConfirmed) {
            seekConfirmed = true
            settle()
          }
        } else if (seekAttempts < MAX_SEEK_ATTEMPTS) {
          seekAttempts++
          doSeek()
        }
      }

      const onError = () => {
        if (finished || !mountedRef.current) return
        console.error("useViewerSequence - Video error:", currentVideo.error)
        finished = true
        cleanup()
        setError("No se pudo cargar el video desde Storage. Verifique que el archivo existe en el bucket 'visores-video'.")
        setIsLocked(false)
        setActiveAnimacion(null)
        activeAnimacionRef.current = null
        // Ensure video is paused on error
        pauseVideo(currentVideo)
      }

      video.addEventListener("loadedmetadata", onLoadedMetadata)
      video.addEventListener("loadeddata", onLoadedData)
      video.addEventListener("canplay", onCanPlay)
      video.addEventListener("seeked", onSeeked)
      video.addEventListener("error", onError)
      transitionCleanupRef.current = cleanup
      transitionSlotRef.current = slot

      // NO se cambia activeSlot aqui. El slot activo se actualiza unicamente en
      // commitSwap(), cuando el video entrante ya tiene un frame decodificado.
      // Marcarlo activo de inmediato dejaba el entrante visible sobre fondo negro
      // durante toda la carga.
      //
      // Si el elemento ya tiene esta URL no se reinicia: reutilizar el elemento
      // ya posicionado evita el round-trip de red y el decode completo, que es
      // la mayor parte de la latencia percibida. En ese caso solo queda el seek.
      if (slotUrlRef.current[slot] !== url) {
        slotUrlRef.current[slot] = url
        video.src = url
        video.load()
        return
      }

      // Misma URL: el metadata sigue disponible, se resuelve de forma sincrona.
      onLoadedMetadata()
      if (!finished && !seekConfirmed) {
        applyTarget()
      }
    },
    [getVideo, clearTransitionWork, getCenterMs],
  )

  // El video global se carga en A al montar y conserva su duración real.
  useEffect(() => {
    if (!videoGlobalUrl) {
      clearTransitionWork()
      pauseVideo(videoRef.current)
      pauseVideo(videoRefB?.current ?? null)
      return
    }

    globalSlotRef.current = "A"
    loadVideo("A", videoGlobalUrl, 0, (video) => {
      const duration = globalDurationMsRef.current
      const center = getCenterMs(duration)
      
      // CRITICAL: Ensure video is paused and at the correct frame center
      pauseVideo(video)
      video.currentTime = center / MS_PER_SEC
      
      handleSlotChange("A", true)
      setDurationMs(duration)
      setCurrentTimeMs(center)
      
      setState("GLOBAL")
      setIsLocked(false)
      setActiveAnimacion(null)
      activeAnimacionRef.current = null
      pendingAnimacionRef.current = null
      // El video global queda pausado en el frame centro (imán). No autoplay.
      onVideoGlobalListo?.()
    }, true)

    return () => {
      clearTransitionWork()
    }
  }, [videoGlobalUrl, loadVideo, handleSlotChange, getCenterMs, clearTransitionWork, onVideoGlobalListo])

  // Actualiza el tiempo mostrado desde el video activo vía evento timeupdate.
  // Reemplaza el loop continuo de RAF (60fps) que saturaba el hilo principal.
  useEffect(() => {
    const handleTimeUpdate = () => {
      const currentActiveVideo = getVideo()
      if (currentActiveVideo && Number.isFinite(currentActiveVideo.currentTime)) {
        setCurrentTimeMs(currentActiveVideo.currentTime * MS_PER_SEC)
      }
    }

    const videoA = videoRef?.current
    const videoB = videoRefB?.current

    videoA?.addEventListener("timeupdate", handleTimeUpdate)
    videoB?.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      videoA?.removeEventListener("timeupdate", handleTimeUpdate)
      videoB?.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [videoRef, videoRefB, getVideo])

  useEffect(() => {
    return () => {
      if (timeRafRef.current !== null) {
        cancelAnimationFrame(timeRafRef.current)
        timeRafRef.current = null
      }
      clearTransitionWork()
    }
  }, [clearTransitionWork])

  // Debe declararse antes de startNodeSequence y reverseToGlobal para evitar
  // referencias a variables en zona temporal muerta (TDZ).
  const snapToMagnet = useCallback(() => {
    const video = getVideo()
    if (!video) return

    const currentState = stateRef.current

    // Animación suave y lenta con easeOutCubic (acelera al principio, frenando al final).
    // El clip de accion devuelve al frame final con el doble de calma que el global
    // (600ms -> 600 x velocidadInversa), para que el rebobinado se lea como una
    // inspeccion lenta y no como un salto.
    const animateTo = (targetMs: number, duration: number) => {
      const currentMs = video.currentTime * MS_PER_SEC
      const diff = targetMs - currentMs

      if (Math.abs(diff) < 5) return

      const startTime = performance.now()
      const startMs = currentMs
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const animate = () => {
        if (!mountedRef.current) return
        const elapsed = performance.now() - startTime
        const progress = Math.min(1, elapsed / duration)
        const easedProgress = easeOutCubic(progress)

        const newPos = startMs + diff * easedProgress
        video.currentTime = newPos / MS_PER_SEC
        setCurrentTimeMs(newPos)

        if (progress < 1) {
          animationRafRef.current = requestAnimationFrame(animate)
        } else {
          video.currentTime = targetMs / MS_PER_SEC
          setCurrentTimeMs(targetMs)
          animationRafRef.current = null
        }
      }

      cancelAnimation()
      animationRafRef.current = requestAnimationFrame(animate)
    }

    if (currentState === "GLOBAL") {
      animateTo(getCenterMs(globalDurationMsRef.current || durationMs), MAGNET_DURATION_MS)
      return
    }

    if (currentState === "ACCION_FIN") {
      const accionEndMs =
        accionEndMsRef.current ||
        (Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration * MS_PER_SEC)
          : 0)
      if (!accionEndMs) return
      animateTo(accionEndMs, MAGNET_DURATION_MS * velocidadInversa)
      return
    }

    pauseVideo(video)
  }, [durationMs, getCenterMs, getVideo, cancelAnimation, velocidadInversa])

  const animateReverse = useCallback(
    (fromMs: number, toMs: number, speed: number, onComplete: () => void) => {
      const video = getVideo()
      if (!video || fromMs <= toMs) {
        onComplete()
        return
      }

      clearTransitionWork()
      video.pause()

      const distance = fromMs - toMs
      // Animación suave y lenta: la duración es proporcional a la distancia recorrida,
      // dividida por la velocidad inversa (speed=2 => 2x más lento que la velocidad normal).
      // Límites: 400ms mínimo, 2000ms máximo para que nunca sea ni brusca ni interminable.
      const duration = Math.max(400, Math.min(2000, distance / speed))
      const startTime = performance.now()
      const startMs = fromMs

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      let rafId: number | null = null

      const cleanup = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
        if (animationRafRef.current === rafId) {
          animationRafRef.current = null
        }
      }

      const tick = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(1, elapsed / duration)
        const easedProgress = easeOutCubic(progress)

        const newPos = startMs - distance * easedProgress
        video.currentTime = newPos / MS_PER_SEC
        setCurrentTimeMs(newPos)

        if (progress < 1) {
          rafId = requestAnimationFrame(tick)
          animationRafRef.current = rafId
        } else {
          // Ensure exact end position
          video.currentTime = toMs / MS_PER_SEC
          setCurrentTimeMs(toMs)
          cleanup()
          onComplete()
        }
      }

      appendTransitionCleanup(cleanup)
      rafId = requestAnimationFrame(tick)
      animationRafRef.current = rafId
    },
    [getVideo, clearTransitionWork, appendTransitionCleanup],
  )

  const startNodeSequence = useCallback(
    (animacion: AnimacionVisor) => {
      const currentVideo = getVideo()
      if (!currentVideo) return

      cancelTransitions()
      setActiveAnimacion(animacion)
      activeAnimacionRef.current = animacion
      setState("MOVIMIENTO")
      setIsLocked(true)
      setError(null)

      if (!animacion.video_movimiento_url) {
        if (animacion.video_accion_url) {
          loadAndPlayAccion(animacion)
        } else {
          // Si no hay videos, volver al frame centro del video global
          const globalVideo = videoRef.current
          if (globalVideo) {
            const duration = globalDurationMsRef.current
            const center = getCenterMs(duration)
            globalVideo.currentTime = center / MS_PER_SEC
            setCurrentTimeMs(center)
          }
          setState("GLOBAL")
          setIsLocked(false)
          setActiveAnimacion(null)
          activeAnimacionRef.current = null
        }
        return
      }

      const movementSlot = getInactiveSlot()
      loadVideo(
        movementSlot,
        animacion.video_movimiento_url,
        0,
        (video) => {
          handleSlotChange(movementSlot, false)
          video.playbackRate = velocidadNormal
          video.muted = true

          // El slot que acaba de liberarse ya puede descargar el video de accion,
          // para que la secuencia movimiento -> accion no espere red ni decode.
          const animForPreload = activeAnimacionRef.current
          if (animForPreload?.video_accion_url) {
            preloadSlot(animForPreload.video_accion_url)
          }

          const onMovimientoEnded = () => {
            video.removeEventListener("ended", onMovimientoEnded)
            const anim = activeAnimacionRef.current
            if (anim?.video_accion_url) {
              loadAndPlayAccion(anim)
            } else {
              // Cambiar slot al video global Y establecer estado GLOBAL antes del timeout
              // para que snapToMagnet vea el estado correcto al ejecutarse
              const globalSlot = getInactiveSlot()
              const globalVideo = videoRef.current
              if (globalVideo) {
                handleSlotChange(globalSlot, true)
              }
              // Actualizar estado ANTES del setTimeout para que stateRef esté sincronizado
              setState("GLOBAL")
              setIsLocked(false)
              setActiveAnimacion(null)
              activeAnimacionRef.current = null
// Usar setTimeout(0) para dar tiempo a React a procesar el estado
              setTimeout(() => {
                snapToMagnet()
              }, 0)
            }
          }

          video.addEventListener("ended", onMovimientoEnded, { once: true })
          appendTransitionCleanup(() => {
            video.removeEventListener("ended", onMovimientoEnded)
          })

          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              setError("No se pudo iniciar el video de movimiento")
              setIsLocked(false)
            })
          }
        },
        false,
      )

      function loadAndPlayAccion(targetAnim: AnimacionVisor) {
        if (!targetAnim.video_accion_url) return

        const actionSlot = getInactiveSlot()
        loadVideo(
          actionSlot,
          targetAnim.video_accion_url,
          0,
          (video) => {
            handleSlotChange(actionSlot, false)
            video.playbackRate = velocidadNormal
            video.muted = true
            setDurationMs(Math.round((video.duration || 0) * MS_PER_SEC))
            setState("ACCION")

            // El slot liberado queda listo con el global para que la reversa
            // (accion -> global) no espere descarga ni seek.
            if (videoGlobalUrl) {
              preloadSlot(videoGlobalUrl)
            }

            const onAccionEnded = () => {
              video.removeEventListener("ended", onAccionEnded)
              // El clip de accion se queda congelado en su ultimo frame. activeAnimacion
              // NO se limpia: mantiene el nodo marcado, su descripcion y el boton
              // «volver», que sigue ejecutando la reversa animada completa.
              const accionEndMs =
                Number.isFinite(video.duration) && video.duration > 0
                  ? Math.round(video.duration * MS_PER_SEC)
                  : Math.round(video.currentTime * MS_PER_SEC)
              accionEndMsRef.current = accionEndMs

              video.pause()
              video.currentTime = accionEndMs / MS_PER_SEC

              // El ultimo «timeupdate» puede haber disparado justo antes del final:
              // sin esto el mango del scrubber se queda sin llegar al borde derecho.
              setCurrentTimeMs(accionEndMs)
              setDurationMs(accionEndMs)
              setState("ACCION_FIN")
              setIsLocked(false)

              // El slot libre se ocupa con el clip de MOVIMIENTO, no con el global.
              // Es justo lo que necesita la reversa en cuanto el usuario pulse
              // «volver», y el usuario puede quedarse inspeccionando frames un rato
              // antes de hacerlo: si aqui se precargara el global, la reversa
              // tendria que descargar el movimiento de red en mitad de la secuencia
              // y ese tramo se perdia.
              const anim = activeAnimacionRef.current
              if (anim?.video_movimiento_url) {
                preloadSlot(anim.video_movimiento_url, "metadata")
              }
            }

            video.addEventListener("ended", onAccionEnded, { once: true })
            appendTransitionCleanup(() => {
              video.removeEventListener("ended", onAccionEnded)
            })

            const playPromise = video.play()
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                setError("No se pudo iniciar el video de acción")
                setIsLocked(false)
              })
            }
          },
          false,
        )
      }
    },
    [
      getVideo,
      getInactiveSlot,
      loadVideo,
      handleSlotChange,
      velocidadNormal,
      cancelTransitions,
      appendTransitionCleanup,
      snapToMagnet,
      preloadSlot,
    ],
  )

  const reverseToGlobal = useCallback(() => {
    const currentAnim = activeAnimacionRef.current
    const currentState = stateRef.current
    const video = getVideo()

    if ((currentState === "GLOBAL" && !currentAnim) || !video) return

    cancelTransitions()
    setState("REVERSA")
    setIsLocked(true)

    const finishReturnToGlobal = () => {
      if (!videoGlobalUrl) {
        setState("GLOBAL")
        setIsLocked(false)
        setActiveAnimacion(null)
        activeAnimacionRef.current = null
        pendingAnimacionRef.current = null
        return
      }

      const globalSlot = getInactiveSlot()
      loadVideo(
        globalSlot,
        videoGlobalUrl,
        0,
        (globalVideo) => {
          const measuredDuration =
            Number.isFinite(globalVideo.duration) && globalVideo.duration > 0
              ? Math.round(globalVideo.duration * MS_PER_SEC)
              : 0
          const duration = measuredDuration || globalDurationMsRef.current
          const center = getCenterMs(duration)
          if (measuredDuration > 0) {
            globalDurationMsRef.current = measuredDuration
          }
          handleSlotChange(globalSlot, true)
          globalVideo.currentTime = center / MS_PER_SEC
          setDurationMs(duration)
          setCurrentTimeMs(center)
          setState("GLOBAL")
          setIsLocked(false)
          setActiveAnimacion(null)
          activeAnimacionRef.current = null

          const pendingAnimacion = pendingAnimacionRef.current
          pendingAnimacionRef.current = null
          if (pendingAnimacion) {
            startNodeSequence(pendingAnimacion)
          }
          
          // Apply smooth magnet effect after returning to global
          // Use setTimeout to ensure state is updated before calling snapToMagnet
          setTimeout(() => {
            snapToMagnet()
          }, 0)
        },
        true,
      )
    }

    const currentMs = Number.isFinite(video.currentTime)
      ? Math.round(video.currentTime * MS_PER_SEC)
      : 0

    if (
      (currentState === "ACCION" || currentState === "ACCION_FIN") &&
      currentAnim?.video_accion_url
    ) {
      animateReverse(currentMs, 0, velocidadInversa, () => {
        if (currentAnim.video_movimiento_url) {
          const movementSlot = getInactiveSlot()
          loadVideo(
            movementSlot,
            currentAnim.video_movimiento_url,
            0,
            (movementVideo) => {
              handleSlotChange(movementSlot, false)
              const movementDuration = Number.isFinite(movementVideo.duration) && movementVideo.duration > 0
                ? Math.round(movementVideo.duration * MS_PER_SEC)
                : 0
              animateReverse(movementDuration, 0, velocidadInversa, finishReturnToGlobal)
            },
            false,
          )
        } else {
          finishReturnToGlobal()
        }
      })
    } else if (currentState === "MOVIMIENTO" && currentAnim?.video_movimiento_url) {
      animateReverse(currentMs, 0, velocidadInversa, finishReturnToGlobal)
    } else {
      finishReturnToGlobal()
    }
  }, [
    getVideo,
    getInactiveSlot,
    videoGlobalUrl,
    frameCentroMs,
    velocidadInversa,
    animateReverse,
    loadVideo,
    handleSlotChange,
    getCenterMs,
    cancelTransitions,
    startNodeSequence,
    snapToMagnet,
  ])

  const selectAnimacion = useCallback(
    (animacion: AnimacionVisor) => {
      if (isLocked) return

      // Re-clic en el nodo que ya esta congelado en su frame final: no hace nada.
      // Sin esta guarda, cualquier clic entraba por la reversa + pendingAnimacion y
      // reejecutaba el mismo clip entero.
      if (
        stateRef.current === "ACCION_FIN" &&
        activeAnimacionRef.current?.id === animacion.id
      ) {
        return
      }

      if (activeAnimacionRef.current) {
        pendingAnimacionRef.current = animacion
        reverseToGlobal()
        return
      }

      startNodeSequence(animacion)
    },
    [isLocked, reverseToGlobal, startNodeSequence],
  )

  const scrubTo = useCallback(
    (timeMs: number) => {
      const video = getVideo()
      if (!video) return
      // SIMPLIFIED: Always pause and set position
      pauseVideo(video)
      const clamped = Math.max(0, Math.min(timeMs, durationMs || 999999))
      video.currentTime = clamped / MS_PER_SEC
      setCurrentTimeMs(clamped)
    },
    [getVideo, durationMs],
  )

  return {
    state,
    activeSlot,
    currentTimeMs,
    durationMs,
    isLocked,
    error,
    activeAnimacion,
    selectAnimacion,
    reverseToGlobal,
    scrubTo,
    snapToMagnet,
    setError,
    cancelTransitions,
    preloadSlot,
    shouldIgnoreMediaError,
  }
}

