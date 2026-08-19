"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Proyecto } from "@/lib/supabase/types"

const COVER_FALLBACK = "/images/placeholder.svg"

function cover(p: Proyecto): string {
  return p.imagen_portada || COVER_FALLBACK
}

export function ProyectosExplorador({ proyectos }: { proyectos: Proyecto[] }) {
  const [q, setQ] = useState("")
  const [cats, setCats] = useState<string[]>([])
  const [activo, setActivo] = useState<Proyecto | null>(null)

  const categorias = useMemo(() => {
    const set = new Set<string>()
    for (const p of proyectos) if (p.categoria) set.add(p.categoria)
    return Array.from(set).sort()
  }, [proyectos])

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return proyectos.filter((p) => {
      const coincideCat = cats.length === 0 || (p.categoria ? cats.includes(p.categoria) : false)
      const coincideQ =
        term === "" ||
        [p.titulo, p.resumen, p.historia]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(term))
      return coincideCat && coincideQ
    })
  }, [proyectos, q, cats])

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      {/* Barra de exploración: buscador + categorías */}
      <div className="sticky top-16 z-30 -mx-6 border-y border-border bg-background/85 px-6 py-4 backdrop-blur-xl lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar proyecto, espacio o material…"
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip activo={cats.length === 0} onClick={() => setCats([])}>
              Todos
            </Chip>
            {categorias.map((c) => (
              <Chip key={c} activo={cats.includes(c)} onClick={() => toggleCat(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Masonry tipo Pinterest */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 text-center">
          <p className="text-muted-foreground">
            No encontramos proyectos con esos filtros. Prueba con otra categoría o búsqueda.
          </p>
        </div>
      ) : (
        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivo(p)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left"
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover(p)}
                  alt={p.titulo}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  {p.categoria && (
                    <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur">
                      {p.categoria}
                    </span>
                  )}
                  <h3 className="mt-2 font-display text-xl leading-tight text-white">
                    {p.titulo}
                  </h3>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!activo} onOpenChange={(o) => !o && setActivo(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          {activo && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-foreground">
                  {activo.titulo}
                </DialogTitle>
                {activo.categoria && (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {activo.categoria}
                  </span>
                )}
              </DialogHeader>

              <div className="mt-2 space-y-6">
                <div className="overflow-hidden rounded-xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover(activo)} alt={activo.titulo} className="w-full object-cover" />
                </div>

                {activo.resumen && (
                  <p className="text-pretty text-lg leading-relaxed text-foreground">
                    {activo.resumen}
                  </p>
                )}
                {activo.historia && (
                  <p className="text-pretty leading-relaxed text-muted-foreground">
                    {activo.historia}
                  </p>
                )}

                {activo.video_url && (
                  <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black/90">
                    {activo.video_url.includes("youtube") || activo.video_url.includes("youtu.be") ? (
                      <iframe
                        src={activo.video_url.replace("watch?v=", "embed/")}
                        title={activo.titulo}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={activo.video_url} controls playsInline className="h-full w-full" />
                    )}
                  </div>
                )}

                {Array.isArray(activo.galeria) && activo.galeria.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {activo.galeria.map((g, i) => {
                      const src = typeof g === "string" ? g : (g as { url?: string })?.url
                      if (!src) return null
                      return (
                        <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`${activo.titulo} ${i + 1}`} className="h-full w-full object-cover" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors",
        activo
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
