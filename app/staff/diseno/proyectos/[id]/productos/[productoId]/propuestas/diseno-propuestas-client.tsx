"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Check, Edit, Loader2, Plus, Send, Trash2, Lock, Copy, Video, ExternalLink, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type EstadoPropuesta = "borrador" | "lista" | "enviada"

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
  orden: number
  created_at: string
  updated_at: string
}

interface DisenoPropuestasClientProps {
  proyectoId: string
  productoId: string
  clienteNombre: string
  productoNombre: string
}

const estados: EstadoPropuesta[] = ["borrador", "lista", "enviada"]

const estadoLabels: Record<EstadoPropuesta, string> = {
  borrador: "Borrador",
  lista: "Lista",
  enviada: "Enviada",
}

const estadoColors: Record<EstadoPropuesta, string> = {
  borrador: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  lista: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  enviada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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

export function DisenoPropuestasClient({ proyectoId, productoId, clienteNombre, productoNombre }: DisenoPropuestasClientProps) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [nombre, setNombre] = useState("")
  const [description, setDescription] = useState("")
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [linkActivoId, setLinkActivoId] = useState<string | null>(null)
  const [copiandoLinkId, setCopiandoLinkId] = useState<string | null>(null)

  const cargarPropuestas = async () => {
    setCargando(true)
    try {
      const data = await request<{ propuestas: Propuesta[] }>(
        `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`,
      )
      setPropuestas(data.propuestas)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar propuestas")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarPropuestas()
  }, [proyectoId, productoId])

  const limpiarFormulario = () => {
    setNombre("")
    setDescription("")
    setEditandoId(null)
  }

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setGuardando(true)
    try {
      const path = editandoId
        ? `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${editandoId}`
        : `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`
      const data = await request<{ propuesta: Propuesta }>(path, {
        method: editandoId ? "PUT" : "POST",
        body: JSON.stringify({ titulo: nombre.trim(), descripcion: description.trim() }),
      })
      setPropuestas((actuales) =>
        editandoId
          ? actuales.map((propuesta) => (propuesta.id === editandoId ? data.propuesta : propuesta))
          : [data.propuesta, ...actuales],
      )
      limpiarFormulario()
      toast.success(editandoId ? "Propuesta actualizada" : "Propuesta creada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar propuesta")
    } finally {
      setGuardando(false)
    }
  }

  const editar = (propuesta: Propuesta) => {
    setEditandoId(propuesta.id)
    setNombre(propuesta.titulo)
    setDescription(propuesta.descripcion ?? "")
  }

  const guardarEdicion = async () => {
    if (!editandoId || !nombre.trim()) {
      toast.error("Nombre es requerido")
      return
    }

    setGuardando(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${editandoId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: nombre.trim(), descripcion: description.trim() || null }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al guardar propuesta")
      }

      toast.success("Propuesta actualizada")
      const data = await res.json()
      setPropuestas((actuales) =>
        actuales.map((propuesta) => (propuesta.id === editandoId ? data.propuesta : propuesta)),
      )
      setEditandoId(null)
      setNombre("")
      setDescription("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar propuesta")
    } finally {
      setGuardando(false)
    }
  }

  const toggleLinkPrivado = async (propuestaId: string, activo: boolean) => {
    setLinkActivoId(propuestaId)
    try {
      const data = await request<{ propuesta: Propuesta }>(
        `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}/link-privado`,
        { method: "POST", body: JSON.stringify({ activo }) },
      )
      setPropuestas((actuales) =>
        actuales.map((propuesta) => (propuesta.id === propuestaId ? data.propuesta : propuesta)),
      )
      toast.success(activo ? "Link privado activado" : "Link privado desactivado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar link privado")
    } finally {
      setLinkActivoId(null)
    }
  }

  const copiarLink = async (token: string) => {
    setCopiandoLinkId(token)
    try {
      const url = `${window.location.origin}/propuestas/${token}`
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado al portapapeles")
    } catch {
      toast.error("Error al copiar link")
    } finally {
      setCopiandoLinkId(null)
    }
  }

  const duplicar = async (propuestaId: string) => {
    setDuplicandoId(propuestaId)
    try {
      const data = await request<{ propuesta: Propuesta }>(
        `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`,
        { method: "POST" },
      )
      setPropuestas((actuales) => [data.propuesta, ...actuales])
      toast.success("Propuesta duplicada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al duplicar propuesta")
    } finally {
      setDuplicandoId(null)
    }
  }

  const cambiarEstado = async (propuestaId: string, estado: EstadoPropuesta) => {
    setGuardando(true)
    try {
      const data = await request<{ propuesta: Propuesta }>(
        `/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}`,
        { method: "PATCH", body: JSON.stringify({ estado }) },
      )
      setPropuestas((actuales) =>
        actuales.map((propuesta) => (propuesta.id === propuestaId ? data.propuesta : propuesta)),
      )
      toast.success(`Estado actualizado: ${estadoLabels[estado]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (propuestaId: string) => {
    setGuardando(true)
    try {
      await request(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuestaId}`, {
        method: "DELETE",
      })
      setPropuestas((actuales) => actuales.filter((propuesta) => propuesta.id !== propuestaId))
      if (editandoId === propuestaId) limpiarFormulario()
      toast.success("Propuesta eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar propuesta")
    } finally {
      setGuardando(false)
      setEliminandoId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/staff/diseno/proyectos">Diseño</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/staff/diseno/proyectos">Proyectos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/staff/diseno/proyectos/${proyectoId}`}>{clienteNombre}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/staff/diseno/proyectos/${proyectoId}`}>Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`}>{productoNombre}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Propuestas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al producto
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-foreground">Propuestas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Crea y administra las propuestas de video para este producto.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-foreground">Propuestas</h2>
              <p className="mt-1 text-sm text-muted-foreground">{propuestas.length} propuestas registradas</p>
            </div>
          </div>

          {cargando ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : propuestas.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
              <Plus className="h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-4 font-medium text-foreground">Aún no hay propuestas</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Crea la primera propuesta para comenzar a organizar este producto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {propuestas.map((propuesta) => (
                <div key={propuesta.id} className={cn("rounded-lg border border-border bg-card/50 p-4", editandoId === propuesta.id && "border-primary/50")}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{propuesta.titulo}</h3>
                        <Badge variant="outline" className={estadoColors[propuesta.estado]}>
                          {estadoLabels[propuesta.estado]}
                        </Badge>
                        {propuesta.link_activo && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Link activo
                          </Badge>
                        )}
                      </div>
                      {propuesta.descripcion && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{propuesta.descripcion}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {propuesta.link_token && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => toggleLinkPrivado(propuesta.id, !propuesta.link_activo)} disabled={linkActivoId === propuesta.id} aria-label={propuesta.link_activo ? "Desactivar link privado" : "Activar link privado"}>
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => copiarLink(propuesta.link_token!)} disabled={copiandoLinkId === propuesta.link_token} aria-label="Copiar link privado">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => duplicar(propuesta.id)} disabled={duplicandoId === propuesta.id} aria-label="Duplicar propuesta">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => editar(propuesta)} aria-label={`Editar ${propuesta.titulo}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEliminandoId(propuesta.id)} aria-label={`Eliminar ${propuesta.titulo}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {estados.map((estadoPropuesta) => (
                      <Button
                        key={estadoPropuesta}
                        variant={propuesta.estado === estadoPropuesta ? "default" : "outline"}
                        size="sm"
                        disabled={guardando || propuesta.estado === estadoPropuesta}
                        onClick={() => void cambiarEstado(propuesta.id, estadoPropuesta)}
                      >
                        {propuesta.estado === estadoPropuesta && <Check className="h-3.5 w-3.5" />}
                        {estadoLabels[estadoPropuesta]}
                      </Button>
                    ))}
                    <Link
                      href={`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuesta.id}`}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Video className="h-4 w-4" />
                      Ver video
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:self-start">
          <h2 className="font-display text-xl text-foreground">{editandoId ? "Editar propuesta" : "Nueva propuesta"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nombre y descripción de la propuesta.</p>
          <form onSubmit={guardar} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="propuesta-nombre" className="text-sm font-medium text-foreground">Nombre</label>
              <Input
                id="propuesta-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej. Propuesta estándar"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="propuesta-descripcion" className="text-sm font-medium text-foreground">Descripción</label>
              <Textarea
                id="propuesta-descripcion"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe la propuesta, materiales, alcance y diferencias."
                rows={5}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={guardando} className="flex-1">
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? "Guardar cambios" : <><Plus className="h-4 w-4" /> Crear propuesta</>}
              </Button>
              {editandoId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditandoId(null)
                  setNombre("")
                  setDescription("")
                }} disabled={guardando}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={!!eliminandoId}
        title="¿Eliminar propuesta?"
        description="Se eliminarán todas las animaciones asociadas a esta propuesta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => eliminar(eliminandoId!)}
        onOpenChange={(open) => !open && setEliminandoId(null)}
      />
    </div>
  )
}