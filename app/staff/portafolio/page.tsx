"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Plus, Trash2, Upload, ImageIcon } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  eliminarProyecto,
  getProyectos,
  guardarProyecto,
} from "@/lib/staff-client"
import type { Proyecto } from "@/lib/supabase/types"
import { CATEGORIAS_PROYECTO } from "@/lib/supabase/types"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AIAssistButton } from "@/components/tonfort/ai-assist-button"
import { ProyectoPreview } from "@/components/tonfort/proyecto-preview"

export default function StaffPortafolioPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [creando, setCreando] = useState(false)
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      setProyectos(await getProyectos())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirCrear = () => {
    setEditando({
      id: "",
      titulo: "",
      slug: "",
      resumen: null,
      historia: null,
      video_url: null,
      imagen_portada: null,
      galeria: [],
      categoria: null,
      orden: 0,
      publicado: false,
      creado_en: "",
      actualizado_en: "",
    })
    setCreando(true)
  }

  const guardar = async (form: Partial<Proyecto>) => {
    try {
      const p = await guardarProyecto(form)
      setProyectos((prev) =>
        creando ? [p, ...prev] : prev.map((x) => (x.id === p.id ? p : x)),
      )
      toast.success(creando ? "Proyecto creado" : "Cambios guardados")
      setEditando(null)
      setCreando(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    }
  }

  const borrar = async (id: string) => {
    const proyecto = proyectos.find((p) => p.id === id)
    if (!proyecto) return
    setProyectoAEliminar(proyecto)
  }
  const confirmarBorrar = async () => {
    if (!proyectoAEliminar) return
    try {
      await eliminarProyecto(proyectoAEliminar.id)
      setProyectos((prev) => prev.filter((p) => p.id !== proyectoAEliminar.id))
      toast.success("Eliminado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar")
    } finally {
      setProyectoAEliminar(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Portafolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Los proyectos publicados aparecen en /proyectos.
          </p>
        </div>
        <Button className="press" onClick={abrirCrear}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
        </Button>
      </div>

      {cargando ? (
        <p className="mt-10 text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.orden}</TableCell>
                  <TableCell>{p.titulo}</TableCell>
                  <TableCell>
                    {p.publicado ? (
                      <span className="text-emerald-600">Publicado</span>
                    ) : (
                      <span className="text-muted-foreground">Borrador</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="press" onClick={() => { setEditando(p); setCreando(false) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="press" onClick={() => borrar(p.id)}>
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
            <DialogTitle>{creando ? "Nuevo proyecto" : "Editar proyecto"}</DialogTitle>
            <DialogDescription>
              Completa los campos y usa el asistente de IA para sugerir textos.
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
  const [slug, setSlug] = useState(proyecto.slug)
  const [resumen, setResumen] = useState(proyecto.resumen ?? "")
  const [historia, setHistoria] = useState(proyecto.historia ?? "")
  const [videoUrl, setVideoUrl] = useState(proyecto.video_url ?? "")
  const [imagen, setImagen] = useState(proyecto.imagen_portada ?? "")
  const [categoria, setCategoria] = useState(proyecto.categoria ?? "")
  const [orden, setOrden] = useState(String(proyecto.orden))
  const [publicado, setPublicado] = useState(proyecto.publicado)
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const fileImagenRef = useRef<HTMLInputElement>(null)

  const getContexto = () => ({
    titulo,
    slug,
    resumen,
    historia,
    categoria,
    video_url: videoUrl,
  })

  const subirVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("slug", slug)
      fd.append("titulo", titulo)
      const res = await fetch("/api/staff/proyectos/upload-video", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      setVideoUrl(data.url)
      toast.success("Video subido")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el video")
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const subirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoImagen(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("slug", slug)
      fd.append("titulo", titulo)
      const res = await fetch("/api/staff/proyectos/upload-imagen", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      setImagen(data.url)
      toast.success("Imagen de portada subida")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen")
    } finally {
      setSubiendoImagen(false)
      if (fileImagenRef.current) fileImagenRef.current.value = ""
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          id: proyecto.id || undefined,
          titulo,
          slug,
          resumen: resumen || null,
          historia: historia || null,
          video_url: videoUrl || null,
          imagen_portada: imagen || null,
          categoria: categoria || null,
          orden: Number(orden) || 0,
          publicado,
        })
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="p-titulo">Título</Label>
            <AIAssistButton campo="Título" getContexto={getContexto} onSugerencia={setTitulo} />
          </div>
          <Input id="p-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-slug">Slug</Label>
          <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-resumen">Resumen</Label>
          <AIAssistButton campo="Resumen" getContexto={getContexto} onSugerencia={setResumen} />
        </div>
          <Textarea id="p-resumen" rows={2} value={resumen} onChange={(e) => setResumen(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-historia">Historia (markdown)</Label>
          <AIAssistButton campo="Historia" getContexto={getContexto} onSugerencia={setHistoria} />
        </div>
        <Textarea id="p-historia" rows={4} value={historia} onChange={(e) => setHistoria(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-video">Video de presentación</Label>
        <Input id="p-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube o mp4 (URL)" />
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={subirVideo}
            disabled={subiendo}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
          />
          <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {subiendo ? "Subiendo…" : "Subir video"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Acepta mp4 y otros formatos (máx. 100 MB). La URL pública se guarda en el proyecto.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={categoria || "sin"} onValueChange={(v) => setCategoria(v === "sin" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sin">Sin categoría</SelectItem>
            {CATEGORIAS_PROYECTO.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-imagen">Imagen de portada</Label>
        <Input id="p-imagen" value={imagen} onChange={(e) => setImagen(e.target.value)} placeholder="URL o sube un archivo" />
        <div className="flex items-center gap-3">
          <input
            ref={fileImagenRef}
            type="file"
            accept="image/*"
            onChange={subirImagen}
            disabled={subiendoImagen}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
          />
          <Button type="button" variant="outline" size="sm" disabled={subiendoImagen} onClick={() => fileImagenRef.current?.click()}>
            <ImageIcon className="mr-2 h-4 w-4" />
            {subiendoImagen ? "Subiendo…" : "Subir imagen"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Es la miniatura que aparece en el listado de /proyectos. Acepta JPG/PNG/WebP (máx. 10 MB).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-orden">Orden</Label>
          <Input id="p-orden" type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Posición del proyecto en el listado de /proyectos. Se ordena de menor a mayor
            (el 0 va primero). Usa números para reordenar sin cambiar título ni slug.
          </p>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          Publicado
        </label>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Vista previa — cómo se verá en /proyectos</p>
        <ProyectoPreview
          titulo={titulo}
          slug={slug}
          resumen={resumen}
          historia={historia}
          videoUrl={videoUrl}
          imagen={imagen}
          categoria={categoria}
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
