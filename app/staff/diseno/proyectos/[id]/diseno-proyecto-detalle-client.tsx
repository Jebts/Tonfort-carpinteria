"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Box, Plus, ChevronRight } from "lucide-react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Proyecto {
  id: string
  cliente_id: string | null
  titulo: string
  descripcion: string | null
  slug: string
  asignado_a: string | null
  orden: number
  publicado: boolean
  created_at: string
  updated_at: string
  asignado: {
    id: string
    nombre: string
    email: string
    rol: string
  } | null
}

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

interface DisenoProyectoDetalleClientProps {
  proyectoId: string
}

export function DisenoProyectoDetalleClient({ proyectoId }: DisenoProyectoDetalleClientProps) {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [creandoProducto, setCreandoProducto] = useState(false)
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState("")
  const [guardandoProducto, setGuardandoProducto] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true)
      try {
        const [proyectoRes, productosRes] = await Promise.all([
          fetch(`/api/staff/diseno/proyectos/${proyectoId}`, { credentials: "include" }),
          fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos`, { credentials: "include" }),
        ])

        if (!proyectoRes.ok) throw new Error("Error al cargar proyecto")
        if (!productosRes.ok) throw new Error("Error al cargar productos")

        const proyectoData = await proyectoRes.json()
        const productosData = await productosRes.json()

        setProyecto(proyectoData.proyecto)
        setProductos(productosData.productos ?? [])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        setCargando(false)
      }
    }
    fetchData()
  }, [proyectoId])

  const handleCrearProducto = async () => {
    if (!nuevoProductoNombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setGuardandoProducto(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${proyectoId}/productos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: nuevoProductoNombre.trim() }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al crear producto")
      }

      toast.success("Producto creado")
      const data = await res.json()
      setProductos([...productos, data.producto])
      setCreandoProducto(false)
      setNuevoProductoNombre("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear producto")
    } finally {
      setGuardandoProducto(false)
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
              <BreadcrumbPage>Productos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6 flex items-center gap-4">
          <Link href="/staff/diseno/proyectos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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

  if (!proyecto) {
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
              <BreadcrumbPage>Productos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6 flex items-center gap-4">
          <Link href="/staff/diseno/proyectos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Proyecto no encontrado</p>
        </div>
      </div>
    )
  }

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
              <Link href={`/staff/diseno/proyectos/${proyectoId}`}>{proyecto.titulo}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Productos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/staff/diseno/proyectos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-foreground">{proyecto.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Proyecto de diseño</p>
        </div>
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", proyecto.publicado ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200")}>
          {proyecto.publicado ? "Publicado" : "Privado"}
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-medium text-lg text-foreground">Productos ({productos.length})</h2>
        <Button onClick={() => setCreandoProducto(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Box className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-foreground">No hay productos aún</h3>
          <p className="mt-2 text-sm text-muted-foreground">Crea tu primer producto para este proyecto</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <Link
              key={producto.id}
              href={`/staff/diseno/proyectos/${proyectoId}/productos/${producto.id}`}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{producto.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {producto.propuesta_count} propuesta{producto.propuesta_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={creandoProducto} onOpenChange={setCreandoProducto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="producto-nombre">Nombre del producto</Label>
              <Input
                id="producto-nombre"
                value={nuevoProductoNombre}
                onChange={(e) => setNuevoProductoNombre(e.target.value)}
                placeholder="Ej. Cocina Isla"
                disabled={guardandoProducto}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreandoProducto(false)
                  setNuevoProductoNombre("")
                }}
                disabled={guardandoProducto}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleCrearProducto} disabled={guardandoProducto}>
                {guardandoProducto ? "Creando..." : "Crear producto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}