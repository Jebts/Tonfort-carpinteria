"use client"

import { useEffect, useState } from "react"
import { Pencil, Trash2, Globe, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategoriaMueble, Proyecto, SedeTaller } from "@/lib/supabase/types"
import {
  CATEGORIAS_MUEBLE,
  ETIQUETA_CATEGORIA,
  ETIQUETA_SEDE,
  SEDES,
} from "@/lib/supabase/types"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AIAssistButton } from "@/components/tonfort/ai-assist-button"
import { ProyectoPreview } from "@/components/tonfort/proyecto-preview"
import { ProyectoFotos } from "@/components/tonfort/staff/proyecto-fotos"

const SIN_CATEGORIA = "sin_categoria"

export default function AdministracionPortafolioPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/staff/administracion/portafolio/proyectos", { credentials: "include" })
      if (!res.ok) throw new Error("Error al cargar proyectos")
      const data = await res.json()
      setProyectos(data.proyectos ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirEditar = (proyecto: Proyecto) => {
    setEditando(proyecto)
  }

  const guardar = async (form: Partial<Proyecto>) => {
    try {
      const res = await fetch(`/api/staff/administracion/portafolio/proyectos/${form.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Error al guardar")
      const data = await res.json()
      setProyectos((prev) => prev.map((x) => (x.id === data.proyecto.id ? data.proyecto : x)))
      toast.success("Cambios guardados")
      setEditando(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    }
  }

  const togglePublicado = async (proyecto: Proyecto) => {
    try {
      const nuevoEstado = !proyecto.publicado
      const res = await fetch(`/api/staff/administracion/portafolio/proyectos/${proyecto.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicado: nuevoEstado }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Error al cambiar estado")
      const data = await res.json()
      setProyectos((prev) =>
        prev.map((x) => (x.id === data.proyecto.id ? data.proyecto : x)),
      )
      toast.success(
        nuevoEstado ? "Proyecto publicado en /portafolio" : "Proyecto ocultado del portafolio",
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar estado")
    }
  }

  const borrar = (proyecto: Proyecto) => {
    setProyectoAEliminar(proyecto)
  }

  const confirmarBorrar = async () => {
    if (!proyectoAEliminar) return
    try {
      const res = await fetch(`/api/staff/administracion/portafolio/proyectos/${proyectoAEliminar.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      setProyectos((prev) => prev.filter((p) => p.id !== proyectoAEliminar.id))
      toast.success("Proyecto eliminado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar")
    } finally {
      setProyectoAEliminar(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Portafolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona la publicación de proyectos creados desde el panel de diseño.
            Los proyectos publicados aparecen en la vista pública de{" "}
            <a
              href="/portafolio"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              /portafolio
            </a>
            .
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
        </div>
      ) : proyectos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-medium text-foreground">No hay proyectos registrados</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea proyectos desde el panel de diseño para que aparezcan aquí.
          </p>
          <Button className="mt-4 press" asChild>
            <a href="/staff/diseno/proyectos">
              Ir al panel de diseño
            </a>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Orden</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado en Portafolio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.orden}</TableCell>
                  <TableCell className="font-medium text-foreground">{p.titulo}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => togglePublicado(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        p.publicado
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p.publicado ? (
                        <>
                          <Eye className="h-3 w-3" /> Publicado
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" /> Borrador
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="press"
                      title="Editar"
                      onClick={() => abrirEditar(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="press text-destructive hover:text-destructive"
                      title="Eliminar"
                      onClick={() => borrar(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Configura el proyecto, su sede, su categoría de mueble, su portada y define si
              estará visible públicamente en el portafolio.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <ProyectoForm
              proyecto={editando}
              onCancel={() => setEditando(null)}
              onSave={guardar}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!proyectoAEliminar}
        title="¿Eliminar proyecto?"
        description={`Vas a eliminar "${proyectoAEliminar?.titulo}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarBorrar}
        onOpenChange={(o) => !o && setProyectoAEliminar(null)}
      />
    </div>
  )
}

function ProyectoForm({
  proyecto,
  onCancel,
  onSave,
}: {
  proyecto: Proyecto
  onCancel: () => void
  onSave: (form: Partial<Proyecto>) => void
}) {
  const [titulo, setTitulo] = useState(proyecto.titulo)
  const [descripcion, setDescripcion] = useState(proyecto.descripcion ?? "")
  const [orden, setOrden] = useState(String(proyecto.orden))
  const [publicado, setPublicado] = useState(proyecto.publicado)
  const [sede, setSede] = useState<SedeTaller>(proyecto.sede ?? "santa_marta")
  const [categoria, setCategoria] = useState<CategoriaMueble | null>(proyecto.categoria ?? null)
  const [portadaUrl, setPortadaUrl] = useState<string | null>(proyecto.portada_url ?? null)

  const getContexto = () => ({
    titulo,
    descripcion,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          id: proyecto.id,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          orden: Number(orden) || 0,
          publicado,
          sede,
          categoria,
          portada_url: portadaUrl,
        })
      }}
      className="space-y-4 pt-2"
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-titulo">Título del proyecto</Label>
          <AIAssistButton campo="Título" getContexto={getContexto} onSugerencia={setTitulo} />
        </div>
        <Input
          id="p-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Cocina Minimalista Prado"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-descripcion">Descripción comercial</Label>
          <AIAssistButton campo="Descripción" getContexto={getContexto} onSugerencia={setDescripcion} />
        </div>
        <Textarea
          id="p-descripcion"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Breve reseña del proyecto, materiales destacados e intención de diseño."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-orden">Orden</Label>
          <Input
            id="p-orden"
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Posición de ordenamiento (0 primero).</p>
        </div>
        <div className="flex flex-col justify-end space-y-1.5 pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Publicar en portafolio
          </label>
          <p className="text-xs text-muted-foreground">Visible para el público general.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-sede">Sede</Label>
          <Select value={sede} onValueChange={(v) => setSede(v as SedeTaller)}>
            <SelectTrigger id="p-sede" className="w-full">
              <SelectValue placeholder="Elige la sede" />
            </SelectTrigger>
            <SelectContent>
              {SEDES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {ETIQUETA_SEDE[s.value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define en qué rama de <code className="font-mono">/portafolio</code> se publica.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-categoria">Categoría de mueble</Label>
          <Select
            value={categoria ?? SIN_CATEGORIA}
            onValueChange={(v) => setCategoria(v === SIN_CATEGORIA ? null : (v as CategoriaMueble))}
          >
            <SelectTrigger id="p-categoria" className="w-full">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
              {CATEGORIAS_MUEBLE.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {ETIQUETA_CATEGORIA[c.value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Una sola categoría por proyecto. Sin categoría no aparece en los filtros.
          </p>
        </div>
      </div>

      <ProyectoFotos
        proyectoId={proyecto.id}
        portadaUrl={portadaUrl}
        onPortadaChange={setPortadaUrl}
      />

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <ProyectoPreview
          titulo={titulo}
          slug={proyecto.slug || "slug-automatico"}
          descripcion={descripcion}
          publicado={publicado}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  )
}