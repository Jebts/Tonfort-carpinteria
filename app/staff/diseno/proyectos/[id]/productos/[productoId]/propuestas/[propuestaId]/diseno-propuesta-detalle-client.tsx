"use client"

import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import {
Check,
  ChevronLeft,
  Copy,
  Edit,
  Eye,
  FileText,
  Globe,
  Layout,
  Link as LinkIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/tonfort/logo"
import { VideoViewer } from "@/components/tonfort/video-viewer"
import { EditorSidebar } from "@/components/tonfort/editor-sidebar"
import type { Propuesta3DAnimacion } from "@/lib/supabase/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type EstadoPropuesta = "borrador" | "lista" | "enviada"
type ModoVista = "edicion" | "visualizador"

interface Propuesta {
  id: string
  producto_id: string
  titulo: string
  descripcion: string | null
  video_global_url: string | null
  frame_centro_ms: number | null
  estado: EstadoPropuesta
  link_token: string | null
  link_activo: boolean
  publicada_portafolio: boolean
  orden: number
  created_at: string
  updated_at: string
}

interface DisenoPropuestaDetalleClientProps {
  proyectoId: string
  productoId: string
  propuestaId: string
  clienteNombre: string
  productoNombre: string
  propuesta: Propuesta
  initialAnimaciones?: Propuesta3DAnimacion[]
  rol?: string
  proyectoLinkToken?: string | null
  proyectoLinkActivo?: boolean
}

const estados: EstadoPropuesta[] = ["borrador", "lista", "enviada"]

const estadoLabels: Record<EstadoPropuesta, string> = {
  borrador: "Borrador",
  lista: "Lista",
  enviada: "Enviada",
}

const estadoColors: Record<EstadoPropuesta, string> = {
  borrador: "bg-[#27272a] text-white/70",
  lista: "bg-[#1e3a5f] text-blue-200",
  enviada: "bg-[#14532d] text-emerald-200",
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
    credentials: "include",
  })
  
  // Handle 401 Unauthorized by redirecting to login
  if (response.status === 401) {
    window.location.href = "/staff/login"
    throw new Error("Sesión expirada. Redirigiendo al login...")
  }
  
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
  
  // Handle 401 Unauthorized by redirecting to login
  if (response.status === 401) {
    window.location.href = "/staff/login"
    throw new Error("Sesión expirada. Redirigiendo al login...")
  }
  
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`)
  return data
}

export function DisenoPropuestaDetalleClient({
  proyectoId,
  productoId,
  propuestaId,
  clienteNombre,
  productoNombre,
  propuesta: propuestaInicial,
  initialAnimaciones = [],
  rol = "disenador",
}: DisenoPropuestaDetalleClientProps) {
  const [modo, setModo] = useState<ModoVista>("edicion")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [propuesta, setPropuesta] = useState<Propuesta>(propuestaInicial)
  const [animaciones, setAnimaciones] = useState<Propuesta3DAnimacion[]>(initialAnimaciones)

  // Nodo / Punto seleccionado actualmente para edición inline
  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState<string | null>(
    initialAnimaciones[0]?.id ?? null,
  )

  // Modales
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [modalVideoGlobalOpen, setModalVideoGlobalOpen] = useState(false)
  const [modalChecklistOpen, setModalChecklistOpen] = useState(false)

  // Formulario Propuesta
  const [nombre, setNombre] = useState(propuestaInicial.titulo)
  const [descripcion, setDescripcion] = useState(propuestaInicial.descripcion ?? "")
  const [frameReferencia, setFrameReferencia] = useState<string>(
    propuestaInicial.frame_centro_ms !== null ? String(propuestaInicial.frame_centro_ms) : "",
  )
  const [guardando, setGuardando] = useState(false)
  const [subiendoVideoGlobal, setSubiendoVideoGlobal] = useState(false)
  const [eliminandoVideoGlobal, setEliminandoVideoGlobal] = useState(false)

  // Subida de archivos por nodo
  const [subiendoMovimientoId, setSubiendoMovimientoId] = useState<string | null>(null)
  const [subiendoAccionId, setSubiendoAccionId] = useState<string | null>(null)

  const basePath = `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}`
  const returnPath = `/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`

  // Obtener la opción de visibilidad actual para el selector del header
  const getVisibilidadOpcion = () => {
    if (propuesta.link_activo) return "privado"
    return "borrador"
  }

  // Cambiar visibilidad desde el selector del Header
  const handleCambiarVisibilidad = async (opcion: "borrador" | "privado") => {
    try {
      if (opcion === "privado") {
        if (!propuesta.video_global_url || propuesta.frame_centro_ms === null) {
          toast.error("Para activar el link se requiere video global y frame centro fijado")
          return
        }
        const res = await request<{ propuesta: Propuesta }>(`${basePath}/link-privado`, {
          method: "POST",
          body: JSON.stringify({ link_activo: true }),
        })
        setPropuesta(res.propuesta)
        toast.success("Link Privado activado para el cliente")
      } else {
        // Borrador / Oculto
        const res = await request<{ propuesta: Propuesta }>(`${basePath}/link-privado`, {
          method: "POST",
          body: JSON.stringify({ link_activo: false }),
        })
        setPropuesta(res.propuesta)
        toast.success("Propuesta guardada como Borrador / Oculto")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar visibilidad")
    }
  }

  // Guardar datos generales de propuesta
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setGuardando(true)
    try {
      const body: Record<string, unknown> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      }
      if (frameReferencia !== "") body.frame_centro_ms = Number(frameReferencia)

      const data = await request<{ propuesta: Propuesta }>(basePath, {
        method: "PUT",
        body: JSON.stringify(body),
      })
      setPropuesta(data.propuesta)
      setModalEditarOpen(false)
      toast.success("Propuesta actualizada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar propuesta")
    } finally {
      setGuardando(false)
    }
  }

  const limpiarFormulario = () => {
    setNombre(propuesta.titulo)
    setDescripcion(propuesta.descripcion ?? "")
    setFrameReferencia(
      propuesta.frame_centro_ms !== null ? String(propuesta.frame_centro_ms) : "",
    )
    setModalEditarOpen(false)
  }

  // Cambiar estado de propuesta
  const cambiarEstado = async (estado: EstadoPropuesta) => {
    setGuardando(true)
    try {
      const data = await request<{ propuesta: Propuesta }>(basePath, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      })
      setPropuesta(data.propuesta)
      toast.success(`Estado actualizado: ${estadoLabels[estado]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
    } finally {
      setGuardando(false)
    }
  }

  // Capturar frame centro desde el reproductor
  const handleCapturarFrameCentro = async (ms: number) => {
    try {
      const data = await request<{ propuesta: Propuesta }>(basePath, {
        method: "PUT",
        body: JSON.stringify({ frame_centro_ms: ms }),
      })
      setPropuesta(data.propuesta)
      setFrameReferencia(String(ms))
      toast.success(`Frame centro fijado en ${Math.round(ms / 1000)}s (${ms} ms)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al fijar frame centro")
    }
  }

  // Subir / Reemplazar Video Global
  const subirVideoGlobal = async (file: File) => {
    setSubiendoVideoGlobal(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const data = await requestForm<{ url: string }>(`${basePath}/upload-global-video`, formData)

      // Update the proposal with the new video URL while preserving existing frame_centro_ms
      const updateBody: Record<string, unknown> = { video_global_url: data.url }
      if (propuesta.frame_centro_ms !== null) {
        updateBody.frame_centro_ms = propuesta.frame_centro_ms
      }

      const updated = await request<{ propuesta: Propuesta }>(basePath, {
        method: "PUT",
        body: JSON.stringify(updateBody),
      })
      
      // Update the proposal state to trigger immediate video reload
      setPropuesta(updated.propuesta)
      setModalVideoGlobalOpen(false)
      toast.success("Video global subido correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir video global")
    } finally {
      setSubiendoVideoGlobal(false)
    }
  }

  // Eliminar Video Global
  const eliminarVideoGlobal = async () => {
    if (!propuesta.video_global_url) return
    if (!window.confirm("¿Eliminar el video global de esta propuesta?")) return

    setEliminandoVideoGlobal(true)
    try {
      const res = await request<{ ok: boolean; propuesta?: Propuesta }>(
        `${basePath}/upload-global-video?url=${encodeURIComponent(propuesta.video_global_url)}`,
        { method: "DELETE" },
      )

      if (res.propuesta) {
        setPropuesta(res.propuesta)
      } else {
        setPropuesta((prev) => ({
          ...prev,
          video_global_url: null,
          estado: "borrador",
          link_activo: false,
        }))
      }
      setModalVideoGlobalOpen(false)
      toast.success("Video global eliminado y estado restablecido a Borrador")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar video global")
    } finally {
      setEliminandoVideoGlobal(false)
    }
  }

  // Copiar link privado
  const copiarLinkPrivado = () => {
    if (!propuesta.link_token) return
    const url = `${window.location.origin}/propuestas/${propuesta.link_token}`
    void navigator.clipboard.writeText(url)
    toast.success("Enlace copiado al portapapeles")
  }

  // Crear un nuevo nodo / punto interactivo
  const agregarNodo = async () => {
    try {
      const res = await request<{ animacion: Propuesta3DAnimacion }>(`${basePath}/animaciones`, {
        method: "POST",
        body: JSON.stringify({
          titulo: `Nodo ${animaciones.length + 1}`,
          descripcion: null,
          video_movimiento_url: "",
          orden: animaciones.length + 1,
        }),
      })

      const nuevas = [...animaciones, res.animacion]
      setAnimaciones(nuevas)
      setNodoSeleccionadoId(res.animacion.id)
      toast.success(`Nodo "${res.animacion.titulo}" creado. Sube sus videos a continuación.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al agregar nodo")
    }
  }

  // Actualizar datos de un nodo (título / descripción)
  const actualizarNodo = async (id: string, titulo: string, descripcion: string) => {
    try {
      const res = await request<{ animacion: Propuesta3DAnimacion }>(
        `${basePath}/animaciones/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
          }),
        },
      )

      setAnimaciones((prev) => prev.map((a) => (a.id === id ? res.animacion : a)))
      toast.success("Nodo actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar nodo")
    }
  }

  // Subir Video de Movimiento para un nodo
  const subirVideoMovimientoNodo = async (animacionId: string, file: File) => {
    setSubiendoMovimientoId(animacionId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await requestForm<{ url: string }>(
        `${basePath}/animaciones/${animacionId}/upload-video?tipo=movimiento`,
        formData,
      )

      const animRes = await request<{ animaciones: Propuesta3DAnimacion[] }>(
        `${basePath}/animaciones`,
      )
      setAnimaciones(animRes.animaciones ?? [])
      toast.success("Video de movimiento subido al nodo")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir video de movimiento")
    } finally {
      setSubiendoMovimientoId(null)
    }
  }

  // Subir Video de Acción para un nodo
  const subirVideoAccionNodo = async (animacionId: string, file: File) => {
    setSubiendoAccionId(animacionId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await requestForm<{ url: string }>(
        `${basePath}/animaciones/${animacionId}/upload-video?tipo=accion`,
        formData,
      )

      const animRes = await request<{ animaciones: Propuesta3DAnimacion[] }>(
        `${basePath}/animaciones`,
      )
      setAnimaciones(animRes.animaciones ?? [])
      toast.success("Video de acción subido al nodo")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir video de acción")
    } finally {
      setSubiendoAccionId(null)
    }
  }

  // Eliminar un nodo
  const eliminarNodo = async (anim: Propuesta3DAnimacion) => {
    if (!window.confirm(`¿Eliminar el nodo "${anim.titulo}" y sus videos asociados?`)) return

    try {
      await request<{ ok: boolean }>(`${basePath}/animaciones/${anim.id}`, {
        method: "DELETE",
      })
      const filtradas = animaciones.filter((a) => a.id !== anim.id)
      setAnimaciones(filtradas)
      if (nodoSeleccionadoId === anim.id) {
        setNodoSeleccionadoId(filtradas[0]?.id ?? null)
      }
      toast.success(`Nodo "${anim.titulo}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar nodo")
    }
  }

  const nodoSeleccionado = animaciones.find((a) => a.id === nodoSeleccionadoId) ?? null

  // Secciones del Sidebar
  const sidebarSections = [
    {
      id: "propuesta",
      label: "Propuesta",
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <div className="text-xs text-white/60">Estado</div>
          <select
            value={propuesta.estado}
            onChange={(e) => cambiarEstado(e.target.value as EstadoPropuesta)}
            className="w-full bg-[#27272a] text-white text-xs rounded-lg px-3 py-2 outline-none"
          >
            {estados.map((estado) => (
              <option key={estado} value={estado} className="bg-[#18181b]">
                {estadoLabels[estado]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={() => setModalEditarOpen(true)}
            className="w-full bg-[#27272a] text-white hover:bg-[#3f3f46] text-xs"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Editar Info
          </Button>
        </div>
      ),
    },
    {
      id: "video",
      label: "Video Global",
      icon: <Video className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setModalVideoGlobalOpen(true)}
            className="w-full bg-[#27272a] text-white hover:bg-[#3f3f46] text-xs"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Subir/Reemplazar
          </Button>
          {propuesta.video_global_url && (
            <Button
              type="button"
              size="sm"
              onClick={eliminarVideoGlobal}
              disabled={eliminandoVideoGlobal}
              className="w-full bg-red-900 text-white hover:bg-red-800 text-xs"
            >
              {eliminandoVideoGlobal ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Eliminar Video
            </Button>
          )}
        </div>
      ),
    },
    {
      id: "nodos",
      label: "Nodos",
      icon: <Layout className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          {/* Selector de nodo */}
          {animaciones.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-white/60">Seleccionar Nodo</div>
              <select
                value={nodoSeleccionadoId ?? ""}
                onChange={(e) => setNodoSeleccionadoId(e.target.value || null)}
                className="w-full bg-[#27272a] text-white text-xs rounded-lg px-3 py-2 outline-none"
              >
                <option value="" className="bg-[#18181b]">
                  -- Seleccionar --
                </option>
                {animaciones.map((anim) => (
                  <option key={anim.id} value={anim.id} className="bg-[#18181b]">
                    {anim.titulo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón agregar */}
          <Button
            type="button"
            size="sm"
            onClick={agregarNodo}
            className="w-full bg-[#3769e6] text-white hover:bg-[#2e59c7] text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Agregar Nodo
          </Button>

          <div className="text-xs text-white/60">
            {animaciones.length} nodo{animaciones.length !== 1 ? "s" : ""}
          </div>

          {/* Panel completo para el nodo seleccionado */}
          {nodoSeleccionado && (
            <div className="mt-4 space-y-4 bg-[#18181b] p-4 rounded-2xl">
              <div className="space-y-2">
                <Label className="text-xs text-white font-medium">Nombre del Nodo</Label>
                <Input
                  value={nodoSeleccionado.titulo}
                  onChange={(e) =>
                    setAnimaciones((prev) =>
                      prev.map((a) =>
                        a.id === nodoSeleccionado.id ? { ...a, titulo: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Ej. Apertura de gaveta"
                  className="bg-[#27272a] border-none text-white text-xs rounded-lg focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white font-medium">Descripción</Label>
                <Textarea
                  value={nodoSeleccionado.descripcion ?? ""}
                  onChange={(e) =>
                    setAnimaciones((prev) =>
                      prev.map((a) =>
                        a.id === nodoSeleccionado.id ? { ...a, descripcion: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Describe los detalles..."
                  rows={2}
                  className="bg-[#27272a] border-none text-white text-xs rounded-lg focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white font-medium">Video de Movimiento</Label>
                <div className="relative rounded-lg bg-[#18181b] p-3 text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        subirVideoMovimientoNodo(nodoSeleccionado.id, file)
                        e.target.value = ""
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={subiendoMovimientoId === nodoSeleccionado.id}
                  />
                  {subiendoMovimientoId === nodoSeleccionado.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-white/60 mx-auto mb-1" />
                      <span className="text-xs text-white/70">
                        {nodoSeleccionado.video_movimiento_url ? "Reemplazar" : "Subir"} movimiento
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white font-medium">Video de Acción (Opcional)</Label>
                <div className="relative rounded-lg bg-[#18181b] p-3 text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        subirVideoAccionNodo(nodoSeleccionado.id, file)
                        e.target.value = ""
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={subiendoAccionId === nodoSeleccionado.id}
                  />
                  {subiendoAccionId === nodoSeleccionado.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-white/60 mx-auto mb-1" />
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
                  actualizarNodo(
                    nodoSeleccionado.id,
                    nodoSeleccionado.titulo,
                    nodoSeleccionado.descripcion ?? "",
                  )
                }
                className="w-full bg-[#27272a] text-white hover:bg-[#3f3f46] text-xs"
              >
                Guardar Cambios
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "publicacion",
      label: "Visibilidad",
      icon: <Globe className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <div className="text-xs text-white/60">Visibilidad</div>
          <select
            value={getVisibilidadOpcion()}
            onChange={(e) =>
              handleCambiarVisibilidad(e.target.value as "borrador" | "privado")
            }
            className="w-full bg-[#27272a] text-white text-xs rounded-lg px-3 py-2 outline-none"
          >
            <option value="borrador" className="bg-[#18181b]">
              🔒 Oculto / Borrador
            </option>
            <option value="privado" className="bg-[#18181b]">
              🔗 Privado (Solo Link)
            </option>
          </select>
        </div>
      ),
    },
    {
      id: "checklist",
      label: "Checklist",
      icon: <Zap className="h-4 w-4" />,
      content: (
        <Button
          type="button"
          size="sm"
          onClick={() => setModalChecklistOpen(true)}
          className="w-full bg-[#27272a] text-orange-400 hover:bg-[#3f3f46] text-xs"
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Blender → Web
        </Button>
      ),
    },
  ]

  return (
    <div suppressHydrationWarning className="fixed inset-0 z-50 w-screen min-h-[100svh] overflow-y-auto overscroll-contain bg-black text-white">
      {/* ========================================================= */}
      {/* SIDEBAR - Solo visible en modo edición                      */}
      {/* ========================================================= */}
      {modo === "edicion" && (
        <div className="relative z-40">
          <EditorSidebar
            sections={sidebarSections}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER - Condicionado por modo                              */}
      {/* ========================================================= */}
      {modo === "visualizador" && propuesta.video_global_url && (
        <header className="sticky top-0 z-50 flex items-center justify-between bg-[#121214] px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={returnPath}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#27272a] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#3f3f46]"
              aria-label="Salir"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Salir</span>
            </Link>
            <span className="font-display font-semibold text-sm text-white">
              {propuesta.titulo}
            </span>
            <Badge variant="outline" className={cn(estadoColors[propuesta.estado], "text-[11px]")}>
              {estadoLabels[propuesta.estado]}
            </Badge>
            <Badge className="bg-white text-black font-semibold text-xs px-3 py-1 rounded-full">
              <Eye className="h-3.5 w-3.5 mr-1" />
              Vista Previa Portafolio
            </Badge>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setModo("edicion")}
            className="rounded-full bg-white text-black hover:bg-white/90 font-semibold text-xs px-4 shadow-md"
            aria-label="Cambiar a modo edición"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Modo Edición
          </Button>
        </header>
      )}

      {modo === "edicion" && (
        <header className="sticky top-0 z-40 flex items-center justify-between bg-[#121214] px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={returnPath}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#27272a] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#3f3f46]"
              aria-label="Salir"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Salir</span>
            </Link>
            <span className="font-display font-semibold text-sm text-white">
              {propuesta.titulo}
            </span>
            <Badge variant="outline" className={cn(estadoColors[propuesta.estado], "text-[11px]")}>
              {estadoLabels[propuesta.estado]}
            </Badge>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setModo("visualizador")}
            className="rounded-full bg-white text-black hover:bg-white/90 font-semibold text-xs px-4 shadow-md"
            aria-label="Cambiar a modo visualización"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Modo Visualizador
          </Button>
        </header>
      )}

      {/* ========================================================= */}
      {/* VIDEOVIEWER - Hero section consolidado, persistente         */}
      {/* ========================================================= */}
      {propuesta.video_global_url ? (
        <div className="relative z-0 w-full">
          <VideoViewer
            key={propuesta.video_global_url}
            video_global_url={propuesta.video_global_url}
            frame_centro_ms={propuesta.frame_centro_ms}
            animaciones={animaciones}
            titulo_proyecto={clienteNombre}
            nombreproducto={productoNombre}
            descripcion={propuesta.descripcion}
            isEditor={modo === "edicion"}
            hideHeader={modo === "edicion"}
            hideContentSection={modo === "edicion"}
            sidebarCollapsed={modo === "edicion" ? sidebarCollapsed : false}
            onAddAnimacion={modo === "edicion" ? () => {
              agregarNodo()
              setSidebarCollapsed(false)
            } : undefined}
            onEditAnimacion={modo === "edicion" ? (anim) => {
              setNodoSeleccionadoId(anim.id)
              setSidebarCollapsed(false)
            } : undefined}
            onDeleteAnimacion={modo === "edicion" ? eliminarNodo : undefined}
          />
        </div>
      ) : (
        /* FALLBACK: Sin video configurado */
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black px-6 text-center">
          <Video className="h-16 w-16 text-white/30 mb-4" />
          <h2 className="text-2xl font-medium text-white mb-1">Sin video configurado</h2>
          <p className="text-sm text-white/60 max-w-md mb-6">
            No hay video global configurado para esta propuesta.
          </p>
          {modo === "visualizador" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setModo("edicion")}
              className="rounded-full bg-[#27272a] text-white hover:bg-[#3f3f46]"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Modo Edición
            </Button>
          ) : (
            <div
              className={cn(
                "relative w-full max-w-lg rounded-2xl bg-[#18181b] p-10 text-center transition-all shadow-xl",
                "hover:bg-[#27272a]",
                subiendoVideoGlobal && "opacity-50 pointer-events-none",
              )}
            >
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    subirVideoGlobal(file)
                    e.target.value = ""
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={subiendoVideoGlobal}
                aria-label="Seleccionar archivo de video"
              />
              <Upload className="mx-auto h-10 w-10 text-white/60 mb-3" />
              <p className="text-white font-medium text-base">
                Arrastra un archivo de video o haz clic para seleccionar
              </p>
              <p className="text-xs text-white/50 mt-1">
                Máximo 100 MB · Formatos: MP4, WebM, MOV
              </p>
              {subiendoVideoGlobal && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Subiendo video al almacenamiento...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTENIDO EDITORIAL - Solo visible en modo edición con video */}
      {/* ========================================================= */}
      {modo === "edicion" && propuesta.video_global_url && (
        <main className={cn("relative min-w-0 overflow-y-auto transition-all duration-300 z-40", sidebarCollapsed ? "ml-0" : "ml-0 md:ml-80")}>
          <div className="relative z-10 bg-black px-6 pb-16 pt-12 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <h1 className="display-lg text-white">{clienteNombre}</h1>
              <p className="mt-4 font-sans text-lg text-white/80">{productoNombre}</p>
              {propuesta.descripcion && (
                <p className="mt-6 font-sans text-base leading-relaxed text-white/70">
                  {propuesta.descripcion}
                </p>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* DIÁLOGO: EDITAR METADATA DE PROPUESTA                     */}
      {/* ========================================================= */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="bg-[#18181b] text-white border-none shadow-2xl max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar información de la propuesta</DialogTitle>
            <DialogDescription className="text-white/70">
              Modifica los detalles, frame de reposo y estado de publicación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="propuesta-nombre" className="text-white font-medium">Nombre</Label>
              <Input
                id="propuesta-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej. Estándar"
                maxLength={120}
                disabled={guardando}
                className="bg-[#27272a] border-none text-white rounded-xl focus-visible:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propuesta-descripcion" className="text-white font-medium">Descripción</Label>
              <Textarea
                id="propuesta-descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Describe materiales, alcance y diferencias de esta alternativa."
                rows={4}
                disabled={guardando}
                className="bg-[#27272a] border-none text-white rounded-xl focus-visible:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propuesta-frame" className="text-white font-medium">Frame de referencia (ms)</Label>
              <Input
                id="propuesta-frame"
                type="number"
                min="0"
                step="500"
                value={frameReferencia}
                onChange={(event) => setFrameReferencia(event.target.value)}
                placeholder="Ej. 5000"
                disabled={guardando}
                className="bg-[#27272a] border-none text-white rounded-xl focus-visible:ring-0"
              />
              <p className="text-xs text-white/60">
                Punto en milisegundos donde reposa la cámara entre animaciones (o usa el botón en el visor).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-white font-medium">Estado</Label>
              <div className="flex flex-wrap gap-2">
                {estados.map((estadoPropuesta) => (
                  <Button
                    key={estadoPropuesta}
                    type="button"
                    size="sm"
                    disabled={guardando || propuesta.estado === estadoPropuesta}
                    onClick={() => cambiarEstado(estadoPropuesta)}
                    className={cn(
                      "rounded-full text-xs font-semibold px-4",
                      propuesta.estado === estadoPropuesta
                        ? "bg-white text-black"
                        : "bg-[#27272a] text-white hover:bg-[#3f3f46]",
                    )}
                  >
                    {propuesta.estado === estadoPropuesta && <Check className="h-3.5 w-3.5 mr-1" />}
                    {estadoLabels[estadoPropuesta]}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                onClick={limpiarFormulario}
                disabled={guardando}
                className="bg-[#27272a] text-white hover:bg-[#3f3f46] rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="bg-white text-black hover:bg-white/90 font-semibold rounded-full px-5"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* DIÁLOGO: GESTIÓN Y SUBIDA DE VIDEO GLOBAL                  */}
      {/* ========================================================= */}
      <Dialog open={modalVideoGlobalOpen} onOpenChange={setModalVideoGlobalOpen}>
        <DialogContent className="bg-[#18181b] text-white border-none shadow-2xl max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Video Global (Barrido 360°)</DialogTitle>
            <DialogDescription className="text-white/70">
              Sube o reemplaza el video base sobre el cual reposa el espacio y conectan las animaciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {propuesta.video_global_url ? (
              <div className="rounded-xl bg-emerald-950 p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="h-5 w-5" />
                    <span className="font-medium text-sm text-white">Video Global Configurado</span>
                  </div>
                  <a
                    href={propuesta.video_global_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-white/90 hover:text-white underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver actual
                  </a>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={eliminarVideoGlobal}
                    disabled={eliminandoVideoGlobal}
                    className="rounded-full text-xs font-medium bg-red-900 hover:bg-red-800 text-white shadow-md"
                  >
                    {eliminandoVideoGlobal ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Eliminar video
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Zona de carga y reemplazo directo (Dropzone siempre accesible) */}
            <div className="space-y-2">
              <Label className="text-xs text-white/80">
                {propuesta.video_global_url
                  ? "Selecciona o arrastra un nuevo archivo para REEMPLAZAR el video global:"
                  : "Subir video global (360°):"}
              </Label>
              <div
                className={cn(
                  "relative rounded-xl bg-[#27272a] p-8 text-center transition-all shadow-md cursor-pointer",
                  "hover:bg-[#3f3f46]",
                  subiendoVideoGlobal && "opacity-50 pointer-events-none",
                )}
              >
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      subirVideoGlobal(file)
                      e.target.value = ""
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={subiendoVideoGlobal}
                  aria-label="Seleccionar archivo de video"
                />
                <Video className="mx-auto h-10 w-10 text-white/60 mb-3" />
                <p className="text-white font-medium text-sm">
                  {propuesta.video_global_url
                    ? "Haz clic o arrastra para reemplazar por un nuevo video"
                    : "Arrastra un archivo de video o haz clic para seleccionar"}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Máximo 100 MB · Formatos: MP4, WebM, MOV
                </p>
                {subiendoVideoGlobal && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs text-white">Subiendo video al almacenamiento...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Checklist */}
      <Dialog open={modalChecklistOpen} onOpenChange={setModalChecklistOpen}>
        <DialogContent className="bg-[#121214] border-none text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Checklist Blender → Web</DialogTitle>
            <DialogDescription className="text-white/70">
              Verifica que tu render esté optimizado para la web.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {[
              "Resolución: 1920x1080 o menor",
              "Códec: H.264 / AAC o WebM VP9",
              "Bitrate: 5-10 Mbps para video global",
              "Frame rate: 30fps",
              "Iluminación horneada (baking)",
              "Bucle suave sin cortes abruptos",
              "Duración: 10-30 segundos ideal",
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}