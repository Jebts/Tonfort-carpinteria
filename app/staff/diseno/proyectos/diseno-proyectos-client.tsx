"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FileText, ChevronRight, Plus, Edit, Trash2, Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

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
  sede: string | null
  categoria: string | null
  asignado: {
    id: string
    nombre: string
    email: string
    rol: string
  } | null
}

type FiltroSede = "santa_marta" | "bogota" | "todas"

interface DisenoProyectosClientProps {
  rol: "admin" | "asesor" | "disenador"
}

export function DisenoProyectosClient({ rol }: DisenoProyectosClientProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [filtroSede, setFiltroSede] = useState<FiltroSede>("santa_marta")
  const [filtroConVisor, setFiltroConVisor] = useState(false)

  const construirUrlFiltros = () => {
    const params = new URLSearchParams()
    if (filtroSede !== "todas") params.set("sede", filtroSede)
    if (filtroConVisor) params.set("conVisor", "true")
    return params.toString() ? `?${params.toString()}` : ""
  }

  const fetchProyectos = async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos${construirUrlFiltros()}`, { credentials: "include" })
      if (!res.ok) throw new Error("Error al cargar proyectos")
      const data = await res.json()
      setProyectos(data.proyectos ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar proyectos")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchProyectos()
  }, [filtroSede, filtroConVisor])

  const limpiarFiltros = () => {
    setFiltroSede("santa_marta")
    setFiltroConVisor(false)
  }

  const hayFiltrosActivos = filtroSede !== "santa_marta" || filtroConVisor

  const handleCrear = async () => {
    if (!titulo.trim()) {
      toast.error("Título es requerido")
      return
    }

    setGuardando(true)
    try {
      const res = await fetch("/api/staff/diseno/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al crear proyecto")
      }

      toast.success("Proyecto creado")
      const data = await res.json()
      setProyectos([data.proyecto, ...proyectos])
      setCreando(false)
      setTitulo("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear proyecto")
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = async () => {
    if (!editando || !titulo.trim()) {
      toast.error("Título es requerido")
      return
    }

    setGuardando(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${editando.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim() }),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al editar proyecto")
      }

      toast.success("Proyecto actualizado")
      const data = await res.json()
      setProyectos((prev) => prev.map((p) => (p.id === data.proyecto.id ? data.proyecto : p)))
      setEditando(null)
      setTitulo("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al editar proyecto")
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!eliminandoId) return

    setGuardando(true)
    try {
      const res = await fetch(`/api/staff/diseno/proyectos/${eliminandoId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al eliminar proyecto")
      }

      toast.success("Proyecto eliminado")
      setProyectos((prev) => prev.filter((p) => p.id !== eliminandoId))
      setEliminandoId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar proyecto")
    } finally {
      setGuardando(false)
    }
  }

  const abrirEditar = (proyecto: Proyecto) => {
    setEditando(proyecto)
    setTitulo(proyecto.titulo)
    setCreando(false)
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
              <BreadcrumbPage>Proyectos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6">
          <h1 className="font-display text-3xl text-foreground">Mis Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyectos asignados para diseño y desarrollo de productos.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando proyectos…</p>
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
            <BreadcrumbPage>Proyectos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Mis Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyectos asignados para diseño y desarrollo de productos.
          </p>
        </div>
        <Button className="press" onClick={() => setCreando(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-sede" className="text-xs text-muted-foreground">Sede</Label>
          <Select value={filtroSede} onValueChange={(v) => setFiltroSede(v as FiltroSede)}>
            <SelectTrigger id="filtro-sede" className="w-[180px]">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="santa_marta">Santa Marta (visor 3D)</SelectItem>
              <SelectItem value="bogota">Bogotá (histórico)</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filtro-visor" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="filtro-visor"
              checked={filtroConVisor}
              onCheckedChange={(checked) => setFiltroConVisor(checked === true)}
            />
            <span className="text-sm">Solo con visor 3D</span>
          </Label>
        </div>

        {hayFiltrosActivos && (
          <Button variant="ghost" size="icon" className="press" onClick={limpiarFiltros} title="Limpiar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {proyectos.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 font-medium text-foreground">
              {hayFiltrosActivos ? "No hay proyectos con los filtros actuales" : "No hay proyectos asignados"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {hayFiltrosActivos
                ? "Prueba cambiando los filtros o limpiándolos."
                : rol === "admin"
                ? "Crea un nuevo proyecto desde este panel para iniciar el diseño."
                : "Contacta al administrador para que te asigne proyectos."}
            </p>
            {hayFiltrosActivos && (
              <Button className="mt-4 press" variant="outline" onClick={limpiarFiltros}>
                <X className="mr-2 h-4 w-4" /> Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Actualizado</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {proyectos.map((proyecto) => (
                <tr key={proyecto.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{proyecto.titulo}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {proyecto.sede === "santa_marta" ? "Santa Marta" : proyecto.sede === "bogota" ? "Bogotá" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", proyecto.publicado ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200")}>
                      {proyecto.publicado ? "Publicado" : "Privado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(proyecto.updated_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/staff/diseno/proyectos/${proyecto.id}`}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        Ver productos
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="press"
                        onClick={() => abrirEditar(proyecto)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="press text-destructive hover:text-destructive"
                        onClick={() => setEliminandoId(proyecto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={creando || !!editando} onOpenChange={(open) => {
        if (!open) {
          setCreando(false)
          setEditando(null)
          setTitulo("")
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creando ? "Nuevo proyecto de diseño" : "Editar proyecto"}</DialogTitle>
            <DialogDescription>
              {creando
                ? "Crea un nuevo proyecto para iniciar el desarrollo de productos y propuestas de video."
                : "Edita la información del proyecto existente."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título del proyecto</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Cocina Isla Moderna"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => {
                setCreando(false)
                setEditando(null)
                setTitulo("")
              }}>
                Cancelar
              </Button>
              <Button type="button" onClick={creando ? handleCrear : handleEditar} disabled={guardando}>
                {guardando ? (creando ? "Creando..." : "Guardando...") : (creando ? "Crear proyecto" : "Guardar cambios")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!eliminandoId}
        title="¿Eliminar proyecto?"
        description="Se eliminarán también todos los productos y propuestas asociados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleEliminar}
        onOpenChange={(open) => !open && setEliminandoId(null)}
      />
    </div>
  )
}