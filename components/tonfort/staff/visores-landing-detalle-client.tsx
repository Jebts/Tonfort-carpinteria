"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import {
  ChevronLeft,
  Edit,
  Eye,
  Layout,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import { EditorSidebar, type SidebarSection } from "@/components/tonfort/editor-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AnimacionVisor, VisorLanding, VisorLandingAnimacion } from "@/lib/supabase/types"

const BASE = "/api/staff/administracion/visores-landing"
const RETURN_PATH = "/staff/administracion/visores"

interface VisoresLandingDetalleClientProps {
  visor: VisorLanding & { animaciones: VisorLandingAnimacion[] }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
    credentials: "include",
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`)
  return data
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    credentials: "include",
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`)
  return data
}

/**
 * Lee la duración de un video remoto con un `<video>` desechable. Devuelve
 * milisegundos, o 0 si el navegador no puede leer los metadatos: el frame
 * centro se calcula como la mitad, pero nunca se inventa.
 */
function leerDuracionVideo(url: string): Promise<number> {
  if (!url) return Promise.resolve(0)

  return new Promise((resolve) => {
    const video = document.createElement("video")
    let resuelto = false

    const terminar = (duracionMs: number) => {
      if (resuelto) return
      resuelto = true
      video.onloadedmetadata = null
      video.onerror = null
      video.removeAttribute("src")
      resolve(duracionMs)
    }

    video.preload = "metadata"
    video.muted = true
    video.onloadedmetadata = () => {
      const segundos = video.duration
      terminar(Number.isFinite(segundos) ? Math.round(segundos * 1000) : 0)
    }
    video.onerror = () => terminar(0)

    video.src = url
  })
}

export function VisoresLandingDetalleClient({ visor: initialVisor }: VisoresLandingDetalleClientProps) {
  const [visor, setVisor] = useState(initialVisor)
  const [animaciones, setAnimaciones] = useState<VisorLandingAnimacion[]>(initialVisor.animaciones)
  const [modo, setModo] = useState<"edicion" | "visualizador">("edicion")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoGlobal, setSubiendoGlobal] = useState(false)

  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState<string | null>(
    initialVisor.animaciones[0]?.id ?? null,
  )
  const [subiendoMovimientoId, setSubiendoMovimientoId] = useState<string | null>(null)
  const [subiendoAccionId, setSubiendoAccionId] = useState<string | null>(null)

  const [titulo, setTitulo] = useState(visor.titulo)
  const [eyebrow, setEyebrow] = useState(visor.eyebrow ?? "")
  const [descripcion, setDescripcion] = useState(visor.descripcion ?? "")
  const [frameCentroMs, setFrameCentroMs] = useState(String(visor.frame_centro_ms ?? 0))
  const [videoGlobalUrl, setVideoGlobalUrl] = useState(visor.video_global_url ?? "")

  const cargarAnimaciones = useCallback(async () => {
    try {
      const data = await request<{ animaciones: VisorLandingAnimacion[] }>(
        `${BASE}/${visor.id}/animaciones`,
      )
      setAnimaciones(data.animaciones)
    } catch {
      /* silencioso: la lista inicial ya viene del servidor */
    }
  }, [visor.id])

  useEffect(() => {
    void cargarAnimaciones()
  }, [cargarAnimaciones])

  const nodoSeleccionado = animaciones.find((item) => item.id === nodoSeleccionadoId) ?? null

  const patchVisor = async (cambios: Partial<VisorLanding>) => {
    const data = await request<{ visor: VisorLanding }>(`${BASE}/${visor.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        titulo,
        eyebrow: eyebrow.trim() || null,
        descripcion: descripcion.trim() || null,
        video_global_url: videoGlobalUrl,
        frame_centro_ms: Number(frameCentroMs) || 0,
        activo: visor.activo,
        orden: visor.orden,
        ...cambios,
      }),
    })
    setVisor((prev) => ({ ...prev, ...data.visor }))
    return data.visor
  }

  const guardarTodo = async () => {
    setGuardando(true)
    try {
      await patchVisor({})
      toast.success("Cambios guardados")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  const subirVideoGlobal = async (file: File) => {
    setSubiendoGlobal(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`${BASE}/${visor.id}/upload-global-video`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? "Error al subir el video")

      const url = data.url ?? ""
      setVideoGlobalUrl(url)

      // Sin duración legible no inventamos un frame: el usuario lo ajusta a mano.
      const duracionMs = await leerDuracionVideo(url)
      const frameSugerido = duracionMs > 0 ? Math.round(duracionMs / 2) : 0

      if (frameSugerido > 0) {
        setFrameCentroMs(String(frameSugerido))
      }
      setVisor((prev) => ({
        ...prev,
        video_global_url: url,
        frame_centro_ms: frameSugerido,
      }))

      // La URL ya quedó guardada por la ruta de subida; el frame viaja en la
      // misma petición para que no quede solo en el estado del cliente.
      if (frameSugerido > 0) {
        await patchVisor({ video_global_url: url, frame_centro_ms: frameSugerido })
      }

      toast.success(
        frameSugerido > 0
          ? `Video actualizado · frame centro en ${(frameSugerido / 1000).toFixed(1)}s`
          : "Video global actualizado",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir el video")
    } finally {
      setSubiendoGlobal(false)
    }
  }

  const eliminarVideoGlobal = async () => {
    setSubiendoGlobal(true)
    try {
      const formData = new FormData()
      const response = await fetch(`${BASE}/${visor.id}/upload-global-video`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Error al eliminar el video")
      }
      setVideoGlobalUrl("")
      setFrameCentroMs("0")
      setVisor((prev) => ({ ...prev, video_global_url: "", frame_centro_ms: 0 }))
      await patchVisor({ video_global_url: "", frame_centro_ms: 0 })
      toast.success("Video global eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar el video")
    } finally {
      setSubiendoGlobal(false)
    }
  }

  const agregarAnimacion = async () => {
    setGuardando(true)
    try {
      const data = await request<{ animacion: VisorLandingAnimacion }>(
        `${BASE}/${visor.id}/animaciones`,
        {
          method: "POST",
          body: JSON.stringify({
            titulo: `Punto ${animaciones.length + 1}`,
            descripcion: null,
            video_movimiento_url: "",
            video_accion_url: null,
            orden: animaciones.length,
          }),
        },
      )
      setAnimaciones((actuales) => [...actuales, data.animacion])
      setNodoSeleccionadoId(data.animacion.id)
      toast.success("Punto creado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el punto")
    } finally {
      setGuardando(false)
    }
  }

  const actualizarNodo = async (id: string, tituloNodo: string, descripcionNodo: string) => {
    try {
      const data = await request<{ animacion: VisorLandingAnimacion }>(
        `${BASE}/${visor.id}/animaciones/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ titulo: tituloNodo, descripcion: descripcionNodo || null }),
        },
      )
      setAnimaciones((actuales) =>
        actuales.map((item) => (item.id === id ? data.animacion : item)),
      )
      toast.success("Punto actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el punto")
    }
  }

  const subirVideoMovimiento = async (animacionId: string, file: File) => {
    setSubiendoMovimientoId(animacionId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await requestForm(`${BASE}/${visor.id}/animaciones/${animacionId}/upload-video?tipo=movimiento`, formData)
      await cargarAnimaciones()
      toast.success("Video de movimiento subido")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir el video de movimiento")
    } finally {
      setSubiendoMovimientoId(null)
    }
  }

  const subirVideoAccion = async (animacionId: string, file: File) => {
    setSubiendoAccionId(animacionId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await requestForm(`${BASE}/${visor.id}/animaciones/${animacionId}/upload-video?tipo=accion`, formData)
      await cargarAnimaciones()
      toast.success("Video de acción subido")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir el video de acción")
    } finally {
      setSubiendoAccionId(null)
    }
  }

  const eliminarAnimacion = async (animacionId: string) => {
    if (!window.confirm("¿Eliminar este punto y sus videos asociados?")) return

    setGuardando(true)
    try {
      await request(`${BASE}/${visor.id}/animaciones/${animacionId}`, { method: "DELETE" })
      const filtradas = animaciones.filter((item) => item.id !== animacionId)
      setAnimaciones(filtradas)
      if (nodoSeleccionadoId === animacionId) {
        setNodoSeleccionadoId(filtradas[0]?.id ?? null)
      }
      toast.success("Punto eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar el punto")
    } finally {
      setGuardando(false)
    }
  }

  const sidebarSections: SidebarSection[] = [
    {
      id: "info",
      label: "Información",
      icon: <Video className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="visor-eyebrow" className="text-sm font-medium text-white">
              Etiqueta
            </label>
            <Input
              id="visor-eyebrow"
              value={eyebrow}
              onChange={(event) => setEyebrow(event.target.value)}
              placeholder="Texto pequeño sobre el título"
              maxLength={120}
              className="border-white/15 bg-[#18181b] text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visor-titulo" className="text-sm font-medium text-white">
              Título
            </label>
            <Input
              id="visor-titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Título del visor"
              maxLength={200}
              className="border-white/15 bg-[#18181b] text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visor-descripcion" className="text-sm font-medium text-white">
              Descripción
            </label>
            <Textarea
              id="visor-descripcion"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Descripción visible en la landing"
              rows={3}
              maxLength={2000}
              className="border-white/15 bg-[#18181b] text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="visor-frame" className="text-sm font-medium text-white">
              Frame centro (ms)
            </label>
            <Input
              id="visor-frame"
              type="number"
              min={0}
              step={100}
              value={frameCentroMs}
              onChange={(event) => setFrameCentroMs(event.target.value)}
              className="border-white/15 bg-[#18181b] text-white placeholder:text-white/40"
            />
          </div>
          <Button
            type="button"
            onClick={() => void guardarTodo()}
            disabled={guardando}
            className="w-full"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>
      ),
    },
    {
      id: "video-global",
      label: "Video global",
      icon: <Video className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="visor-video-url" className="text-sm font-medium text-white">
              URL del video global
            </label>
            <Input
              id="visor-video-url"
              value={videoGlobalUrl}
              onChange={(event) => setVideoGlobalUrl(event.target.value)}
              placeholder="https://..."
              className="border-white/15 bg-[#18181b] text-white placeholder:text-white/40"
            />
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-white/80 transition-colors hover:bg-[#18181b]">
            {subiendoGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            {subiendoGlobal ? "Subiendo…" : "Subir video global"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void subirVideoGlobal(file)
              }}
            />
          </label>
          {videoGlobalUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void eliminarVideoGlobal()}
              disabled={subiendoGlobal}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar video
            </Button>
          )}
        </div>
      ),
    },
    {
      id: "animaciones",
      label: "Animaciones",
      icon: <Layout className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          {animaciones.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-white/60">Seleccionar punto</div>
              <select
                value={nodoSeleccionadoId ?? ""}
                onChange={(event) => setNodoSeleccionadoId(event.target.value || null)}
                className="w-full rounded-lg bg-[#27272a] px-3 py-2 text-xs text-white outline-none"
              >
                <option value="" className="bg-[#18181b]">
                  -- Seleccionar --
                </option>
                {animaciones.map((animacion) => (
                  <option key={animacion.id} value={animacion.id} className="bg-[#18181b]">
                    {animacion.titulo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => void agregarAnimacion()}
            disabled={guardando}
            className="w-full bg-[#3769e6] text-xs text-white hover:bg-[#2e59c7]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar punto
          </Button>

          <div className="text-xs text-white/60">
            {animaciones.length} punto{animaciones.length !== 1 ? "s" : ""}
          </div>

          {nodoSeleccionado && (
            <div className="mt-4 space-y-4 rounded-2xl bg-[#18181b] p-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-white">Nombre del punto</Label>
                <Input
                  value={nodoSeleccionado.titulo}
                  onChange={(event) =>
                    setAnimaciones((prev) =>
                      prev.map((item) =>
                        item.id === nodoSeleccionado.id
                          ? { ...item, titulo: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Ej. Apertura de gaveta"
                  className="rounded-lg border-none bg-[#27272a] text-xs text-white focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-white">Descripción</Label>
                <Textarea
                  value={nodoSeleccionado.descripcion ?? ""}
                  onChange={(event) =>
                    setAnimaciones((prev) =>
                      prev.map((item) =>
                        item.id === nodoSeleccionado.id
                          ? { ...item, descripcion: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Describe los detalles..."
                  rows={2}
                  className="rounded-lg border-none bg-[#27272a] text-xs text-white focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-white">Video de movimiento</Label>
                <div className="relative rounded-lg bg-[#18181b] p-3 text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void subirVideoMovimiento(nodoSeleccionado.id, file)
                        event.target.value = ""
                      }
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    disabled={subiendoMovimientoId === nodoSeleccionado.id}
                  />
                  {subiendoMovimientoId === nodoSeleccionado.id ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <>
                      <Upload className="mx-auto mb-1 h-4 w-4 text-white/60" />
                      <span className="text-xs text-white/70">
                        {nodoSeleccionado.video_movimiento_url ? "Reemplazar" : "Subir"} movimiento
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-white">Video de acción (opcional)</Label>
                <div className="relative rounded-lg bg-[#18181b] p-3 text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void subirVideoAccion(nodoSeleccionado.id, file)
                        event.target.value = ""
                      }
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    disabled={subiendoAccionId === nodoSeleccionado.id}
                  />
                  {subiendoAccionId === nodoSeleccionado.id ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <>
                      <Upload className="mx-auto mb-1 h-4 w-4 text-white/60" />
                      <span className="text-xs text-white/70">
                        {nodoSeleccionado.video_accion_url ? "Reemplazar" : "Subir"} acción
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void actualizarNodo(
                    nodoSeleccionado.id,
                    nodoSeleccionado.titulo,
                    nodoSeleccionado.descripcion ?? "",
                  )
                }
                className="w-full bg-[#27272a] text-xs text-white hover:bg-[#3f3f46]"
              >
                Guardar cambios
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => void eliminarAnimacion(nodoSeleccionado.id)}
                className="w-full bg-red-900 text-xs text-white hover:bg-red-800"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Eliminar punto
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "visibilidad",
      label: "Visibilidad",
      icon: <Eye className="h-4 w-4" />,
      content: (
        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={visor.activo}
            onChange={(event) => {
              void patchVisor({ activo: event.target.checked }).then(() => {
                toast.success(
                  event.target.checked ? "Visor activo en la landing" : "Visor oculto",
                )
              })
            }}
            className="size-4 accent-white"
          />
          Activo en la landing
        </label>
      ),
    },
  ]

  if (!visor.video_global_url) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-[100svh] flex-col items-center justify-center bg-black px-6 text-center text-white">
        <EditorSidebar
          sections={sidebarSections}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <Video className="h-10 w-10 text-white/40" />
        <h1 className="mt-5 font-display text-2xl">Sin video configurado</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          Sube el video global desde el panel izquierdo para empezar a editar las animaciones.
        </p>
        <Link
          href={RETURN_PATH}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#27272a] px-4 py-2 text-sm font-medium text-white hover:bg-[#3f3f46]"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a visores
        </Link>
      </div>
    )
  }

  return (
    <div suppressHydrationWarning className="fixed inset-0 z-50 min-h-[100svh] w-screen overflow-y-auto overscroll-contain bg-black text-white">
      {modo === "edicion" && (
        <div className="relative z-40">
          <EditorSidebar
            sections={sidebarSections}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 flex items-center justify-between bg-[#121214] px-4 py-3",
          modo === "edicion" && "md:pl-72",
        )}
      >
        <div className="flex items-center gap-3">
          <Link
            href={RETURN_PATH}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#27272a] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#3f3f46]"
            aria-label="Salir"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Salir</span>
          </Link>
          <span className="font-display text-sm font-semibold text-white">{visor.titulo}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[11px]",
              visor.activo
                ? "border-green-500/40 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "border-white/20 text-white/60",
            )}
          >
            {visor.activo ? "Activo" : "Oculto"}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setModo(modo === "edicion" ? "visualizador" : "edicion")}
          className="rounded-full bg-white px-4 text-xs font-semibold text-black shadow-md hover:bg-white/90"
        >
          {modo === "edicion" ? (
            <>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Modo Visualizador
            </>
          ) : (
            <>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Modo Edición
            </>
          )}
        </Button>
      </header>

      <div className={cn("relative z-0 w-full", modo === "edicion" && "md:pl-72")}>
        <VideoViewer<AnimacionVisor>
          key={visor.video_global_url}
          video_global_url={visor.video_global_url}
          frame_centro_ms={visor.frame_centro_ms}
          animaciones={animaciones as AnimacionVisor[]}
          titulo_proyecto={visor.titulo}
          nombreproducto={visor.descripcion ?? ""}
          isEditor={modo === "edicion"}
          sidebarCollapsed={modo === "edicion" ? sidebarCollapsed : true}
          onAddAnimacion={
            modo === "edicion"
              ? () => {
                  void agregarAnimacion()
                  setSidebarCollapsed(false)
                }
              : undefined
          }
          onEditAnimacion={
            modo === "edicion"
              ? (animacion) => {
                  setNodoSeleccionadoId(animacion.id)
                  setSidebarCollapsed(false)
                }
              : undefined
          }
          onDeleteAnimacion={
            modo === "edicion" ? (animacion) => void eliminarAnimacion(animacion.id) : undefined
          }
        />
      </div>
    </div>
  )
}
