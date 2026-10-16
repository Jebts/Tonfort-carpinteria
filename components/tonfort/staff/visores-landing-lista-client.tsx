"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2, Lock, Plus, Trash2, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Visor {
  id: string
  eyebrow: string | null
  titulo: string
  descripcion: string | null
  video_global_url: string
  frame_centro_ms: number
  activo: boolean
  orden: number
  animaciones: { id: string; titulo: string }[]
  created_at: string
}

const BASE = "/api/staff/administracion/visores-landing"

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

export function VisoresLandingListaClient() {
  const [visores, setVisores] = useState<Visor[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [toggleId, setToggleId] = useState<string | null>(null)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)

  const [titulo, setTitulo] = useState("")
  const [eyebrow, setEyebrow] = useState("")
  const [descripcion, setDescripcion] = useState("")

  const cargarVisores = async () => {
    setCargando(true)
    try {
      const data = await request<{ visores: Visor[] }>(BASE)
      setVisores(data.visores)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar visores")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarVisores()
  }, [])

  const limpiarFormulario = () => {
    setTitulo("")
    setEyebrow("")
    setDescripcion("")
  }

  const crearVisor = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!titulo.trim()) {
      toast.error("El título es requerido")
      return
    }

    setGuardando(true)
    try {
      const data = await request<{ visor: Visor }>(BASE, {
        method: "POST",
        body: JSON.stringify({
          titulo: titulo.trim(),
          eyebrow: eyebrow.trim() || null,
          descripcion: descripcion.trim() || null,
          video_global_url: "",
          frame_centro_ms: 0,
          activo: false,
        }),
      })
      setVisores((actuales) => [...actuales, data.visor])
      limpiarFormulario()
      setModalCrearAbierto(false)
      toast.success("Visor creado")
      window.location.href = `/staff/administracion/visores/${data.visor.id}`
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear visor")
    } finally {
      setGuardando(false)
    }
  }

  const alternarPublicacion = async (visor: Visor) => {
    const activo = !visor.activo
    if (activo && !visor.video_global_url) {
      toast.error("Sube el video global antes de publicar el visor")
      return
    }

    setToggleId(visor.id)
    try {
      const data = await request<{ visor: Visor }>(`${BASE}/${visor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          titulo: visor.titulo,
          eyebrow: visor.eyebrow,
          descripcion: visor.descripcion,
          video_global_url: visor.video_global_url,
          frame_centro_ms: visor.frame_centro_ms,
          activo,
        }),
      })
      setVisores((actuales) =>
        actuales.map((item) => (item.id === visor.id ? { ...item, ...data.visor } : item)),
      )
      toast.success(activo ? "Visor publicado en la landing" : "Visor privatizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar la publicación")
    } finally {
      setToggleId(null)
    }
  }

  const eliminar = async (visorId: string) => {
    setGuardando(true)
    try {
      await request(`${BASE}/${visorId}`, { method: "DELETE" })
      setVisores((actuales) => actuales.filter((visor) => visor.id !== visorId))
      toast.success("Visor eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar visor")
    } finally {
      setGuardando(false)
      setEliminandoId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/staff/administracion">Administración</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Visores landing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Visores landing</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Los visores 3D que se recorren en el carrusel de la página de inicio.
          </p>
        </div>
        <Button onClick={() => setModalCrearAbierto(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Crear visor
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {cargando ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visores.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay visores. Crea el primero para el carrusel de la landing.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visores.map((visor) => (
              <li key={visor.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/staff/administracion/visores/${visor.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {visor.titulo}
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        visor.activo
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {visor.activo ? "Publicado" : "Oculto"}
                    </span>
                    {!visor.video_global_url && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Sin video
                      </span>
                    )}
                  </div>
                  {visor.eyebrow && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{visor.eyebrow}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void alternarPublicacion(visor)}
                    disabled={toggleId === visor.id}
                  >
                    {toggleId === visor.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : visor.activo ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    {visor.activo ? "Privatizar" : "Publicar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEliminandoId(visor.id)}
                    aria-label={`Eliminar ${visor.titulo}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={modalCrearAbierto}
        onOpenChange={(open) => {
          setModalCrearAbierto(open)
          if (!open) limpiarFormulario()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo visor</DialogTitle>
          </DialogHeader>
          <form onSubmit={crearVisor} className="mt-2 space-y-4">
            <div className="space-y-2">
              <label htmlFor="visor-titulo" className="text-sm font-medium text-foreground">
                Título
              </label>
              <Input
                id="visor-titulo"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ej. Presentación cocina"
                maxLength={200}
                disabled={guardando}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="visor-eyebrow" className="text-sm font-medium text-foreground">
                Etiqueta
              </label>
              <Input
                id="visor-eyebrow"
                value={eyebrow}
                onChange={(event) => setEyebrow(event.target.value)}
                placeholder="Texto pequeño sobre el título"
                maxLength={120}
                disabled={guardando}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="visor-descripcion" className="text-sm font-medium text-foreground">
                Descripción
              </label>
              <Textarea
                id="visor-descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Describe la pieza que se muestra en el visor."
                rows={4}
                maxLength={2000}
                disabled={guardando}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalCrearAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !titulo.trim()}>
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear visor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!eliminandoId}
        title="¿Eliminar visor?"
        description="Se eliminarán todas las animaciones asociadas a este visor. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => eliminar(eliminandoId!)}
        onOpenChange={(open) => !open && setEliminandoId(null)}
      />
    </div>
  )
}
