"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Box, ChevronRight, ArrowLeft, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Producto {
  id: string
  proyecto_id: string
  titulo: string
  descripcion: string | null
  orden: number
  created_at: string
  updated_at: string
  propuesta_count: number
}

interface Propuesta3D {
  id: string
  producto_id: string
  titulo: string
  descripcion: string | null
  video_global_url: string | null
  frame_centro_ms: number | null
  estado: "borrador" | "lista" | "enviada"
  link_token: string | null
  link_activo: boolean
  publicada_portafolio: boolean
  orden: number
  created_at: string
  updated_at: string
}

interface DisenoProductoDetalleClientProps {
  proyectoId: string
  productoId: string
  productoNombre: string
}

export function DisenoProductoDetalleClient({ proyectoId, productoId, productoNombre }: DisenoProductoDetalleClientProps) {
  const [producto, setProducto] = useState<Producto | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta3D[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [editTitulo, setEditTitulo] = useState("")
  const [editDescripcion, setEditDescripcion] = useState("")
  const [eliminando, setEliminando] = useState(false)
  const [creandoPropuesta, setCreandoPropuesta] = useState(false)
  const [nuevaPropuestaNombre, setNuevaPropuestaNombre] = useState("")
  const [guardandoPropuesta, setGuardandoPropuesta] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true)
      try {
        const [productoRes, propuestasRes] = await Promise.all([
          fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, { credentials: "include" }),
          fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`, { credentials: "include" }),
        ])

        if (!productoRes.ok) throw new Error("Error al cargar producto")
        if (!propuestasRes.ok) throw new Error("Error al cargar propuestas")

        const productoData = await productoRes.json()
        const propuestasData = await propuestasRes.json()

        setProducto(productoData.producto)
        setPropuestas(propuestasData.propuestas ?? [])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setCargando(false)
      }
    }
    fetchData()
  }, [proyectoId, productoId])

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    lista: "Lista",
    enviada: "Enviada",
  }

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    lista: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    enviada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }

  async function crearPropuesta() {
    if (!nuevaPropuestaNombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setGuardandoPropuesta(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: nuevaPropuestaNombre.trim() }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al crear propuesta")
      }

      toast.success("Propuesta creada")
      const data = await res.json()
      setPropuestas([...propuestas, data.propuesta])
      setCreandoPropuesta(false)
      setNuevaPropuestaNombre("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear propuesta")
    } finally {
      setGuardandoPropuesta(false)
    }
  }

  const handleEditarProducto = async () => {
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: editTitulo, descripcion: editDescripcion }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al editar producto")
      }

      toast.success("Producto actualizado")
      const data = await res.json()
      setProducto(data.producto)
      setEditando(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al editar producto")
    }
  }

  const handleEliminarProducto = async () => {
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al eliminar producto")
      }

      toast.success("Producto eliminado")
      window.location.href = `/staff/diseno/proyectos/${proyectoId}`
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar producto")
    }
  }

  const abrirEditar = () => {
    if (producto) {
      setEditTitulo(producto.titulo)
      setEditDescripcion(producto.descripcion ?? "")
      setEditando(true)
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-5xl">
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
                <Link href={`/staff/diseno/proyectos/${proyectoId}`}>Productos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{productoNombre}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Propuestas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/staff/diseno/proyectos/${proyectoId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <div>
            <h1 className="font-display text-3xl text-foreground">Cargando…</h1>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    )
  }

  if (!producto) {
    return (
      <div className="mx-auto max-w-5xl">
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
                <Link href={`/staff/diseno/proyectos/${proyectoId}`}>Productos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{productoNombre}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Propuestas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/staff/diseno/proyectos/${proyectoId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Producto no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-5xl">
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
              <Link href={`/staff/diseno/proyectos/${proyectoId}`}>Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}`}>{producto.titulo}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Propuestas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/staff/diseno/proyectos/${proyectoId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-foreground">{producto.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Producto del proyecto</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="press"
            onClick={abrirEditar}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="press text-destructive hover:text-destructive"
            onClick={() => setEliminando(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-medium text-lg text-foreground">Propuestas ({propuestas.length})</h2>
        <Button onClick={() => setCreandoPropuesta(true)}>
          <Box className="h-4 w-4 mr-2" />
          Nueva propuesta
        </Button>
      </div>

      {propuestas.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Box className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-foreground">No hay propuestas aún</h3>
          <p className="mt-2 text-sm text-muted-foreground">Crea tu primera propuesta de video para este producto</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propuestas.map((propuesta) => (
            <Link
              key={propuesta.id}
              href={`/staff/diseno/proyectos/${proyectoId}/productos/${productoId}/propuestas/${propuesta.id}`}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{propuesta.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", estadoColors[propuesta.estado])}>
                      {estadoLabels[propuesta.estado]}
                    </span>
                  </p>
                  {propuesta.video_global_url && (
                    <p className="mt-2 text-sm text-muted-foreground">Video global subido</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input
                id="edit-titulo"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                placeholder="Nombre del producto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <textarea
                id="edit-descripcion"
                rows={3}
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Descripción del producto"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleEditarProducto}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    <ConfirmDialog
      open={eliminando}
      title="¿Eliminar producto?"
      description="Se eliminarán todas las propuestas asociadas a este producto. Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={handleEliminarProducto}
      onOpenChange={setEliminando}
    />

    <Dialog open={creandoPropuesta} onOpenChange={setCreandoPropuesta}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva propuesta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="propuesta-nombre">Nombre de la propuesta</Label>
            <Input
              id="propuesta-nombre"
              value={nuevaPropuestaNombre}
              onChange={(e) => setNuevaPropuestaNombre(e.target.value)}
              placeholder="Ej. Opción Roble & Cuarzo"
              disabled={guardandoPropuesta}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreandoPropuesta(false)
                setNuevaPropuestaNombre("")
              }}
              disabled={guardandoPropuesta}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={crearPropuesta} disabled={guardandoPropuesta}>
              {guardandoPropuesta ? "Creando..." : "Crear propuesta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}