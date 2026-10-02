"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageIcon, Star, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ProyectoFoto } from "@/lib/supabase/types"
import { IMAGEN_MAX_SIZE, IMAGEN_MIME_TYPES } from "@/lib/storage"

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

const MB = Math.round(IMAGEN_MAX_SIZE / (1024 * 1024))

function altDesdeNombre(nombre: string): string | null {
  const sinExtension = nombre.replace(/\.[^.]+$/, "")
  const limpio = sinExtension.replace(/[-_]+/g, " ").trim()
  return limpio.length > 0 ? limpio.slice(0, 200) : null
}

export function ProyectoFotos({
  proyectoId,
  portadaUrl,
  onPortadaChange,
}: {
  proyectoId: string
  portadaUrl: string | null
  onPortadaChange: (url: string | null) => void
}) {
  const [fotos, setFotos] = useState<ProyectoFoto[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [accionando, setAccionando] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch(
        `/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`,
        { credentials: "include", cache: "no-store" },
      )
      if (!res.ok) throw new Error("No se pudieron cargar las fotos")
      const data = (await res.json()) as { fotos: ProyectoFoto[] }
      setFotos(data.fotos ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar las fotos")
    } finally {
      setCargando(false)
    }
  }, [proyectoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const subir = async (archivo: File) => {
    if (!IMAGEN_MIME_TYPES.includes(archivo.type)) {
      toast.error("El archivo debe ser imagen (JPG, PNG, WebP o AVIF)")
      return
    }
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append("file", archivo)
      formData.append("alt", altDesdeNombre(archivo.name) ?? "")
      const res = await fetch(
        `/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos`,
        { method: "POST", body: formData, credentials: "include" },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No se pudo subir la foto")
      }
      const data = (await res.json()) as { foto: ProyectoFoto }
      setFotos((prev) => [...prev, data.foto])
      toast.success("Foto subida")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la foto")
    } finally {
      setSubiendo(false)
    }
  }

  const usarComoPortada = async (foto: ProyectoFoto) => {
    setAccionando(foto.id)
    try {
      const res = await fetch(
        `/api/staff/administracion/portafolio/proyectos/${proyectoId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ portada_url: foto.url }),
          credentials: "include",
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No se pudo actualizar la portada")
      }
      onPortadaChange(foto.url)
      toast.success("Portada actualizada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la portada")
    } finally {
      setAccionando(null)
    }
  }

  const quitarPortada = async () => {
    setAccionando("portada")
    try {
      const res = await fetch(
        `/api/staff/administracion/portafolio/proyectos/${proyectoId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ portada_url: null }),
          credentials: "include",
        },
      )
      if (!res.ok) throw new Error("No se pudo quitar la portada")
      onPortadaChange(null)
      toast.success("Portada quitada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar la portada")
    } finally {
      setAccionando(null)
    }
  }

  const eliminar = async (foto: ProyectoFoto) => {
    setAccionando(foto.id)
    try {
      const res = await fetch(
        `/api/staff/administracion/portafolio/proyectos/${proyectoId}/fotos/${foto.id}`,
        { method: "DELETE", credentials: "include" },
      )
      if (!res.ok) throw new Error("No se pudo eliminar la foto")
      setFotos((prev) => prev.filter((f) => f.id !== foto.id))
      if (portadaUrl === foto.url) onPortadaChange(null)
      toast.success("Foto eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la foto")
    } finally {
      setAccionando(null)
    }
  }

  const accept = IMAGEN_MIME_TYPES.map((mime) => EXTENSIONES[mime] ?? mime).join(",")

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-fotos">Galería y portada</Label>
          <p className="text-xs text-muted-foreground">
            Hasta {MB} MB por imagen. La portada se muestra a sangre en la página pública del
            proyecto; la galería conserva el orden de subida.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="press"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {subiendo ? "Subiendo…" : "Subir foto"}
        </Button>
        <input
          ref={inputRef}
          id="p-fotos"
          type="file"
          accept={accept}
          className="hidden"
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            e.target.value = ""
            if (archivo) void subir(archivo)
          }}
        />
      </div>

      {portadaUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
          <img
            src={portadaUrl}
            alt="Portada del proyecto"
            className="h-14 w-20 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Portada actual</p>
            <p className="truncate text-xs text-muted-foreground">{portadaUrl.split("/").pop()}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="press"
            disabled={accionando === "portada"}
            onClick={quitarPortada}
          >
            {accionando === "portada" ? "Quitando…" : "Quitar portada"}
          </Button>
        </div>
      )}

      {cargando ? (
        <p className="rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          Cargando fotos…
        </p>
      ) : fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Sin fotos. Sube al menos una para que el proyecto tenga galería.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto) => {
            const esPortada = portadaUrl === foto.url
            const ocupada = accionando === foto.id
            return (
              <li
                key={foto.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="relative">
                  <img
                    src={foto.url}
                    alt={foto.alt ?? `Foto ${foto.orden + 1} del proyecto`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {esPortada && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      <Star className="h-3 w-3" />
                      Portada
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-2">
                  <p className="truncate text-[11px] text-muted-foreground">
                    {foto.alt ?? `Orden ${foto.orden + 1}`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="press h-8 flex-1 px-2 text-xs"
                      disabled={esPortada || ocupada}
                      onClick={() => usarComoPortada(foto)}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {esPortada ? "Es portada" : "Usar como portada"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="press h-8 w-8 text-destructive hover:text-destructive"
                      title="Eliminar"
                      disabled={ocupada}
                      onClick={() => eliminar(foto)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
