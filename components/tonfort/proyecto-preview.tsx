"use client"

import { Play } from "lucide-react"
import type { Proyecto } from "@/lib/supabase/types"

const COVER_FALLBACK = "/images/placeholder.svg"

// Vista previa en vivo de cómo se verá el proyecto en /proyectos (listado + ficha).
// Replica el estilo de components/tonfort/proyectos-explorador.tsx para que el
// staff valide portada, categoría, título, resumen, historia y video antes de guardar.
export function ProyectoPreview({
  titulo,
  slug,
  resumen,
  historia,
  videoUrl,
  imagen,
  categoria,
}: {
  titulo: string
  slug: string
  resumen: string
  historia: string
  videoUrl: string
  imagen: string
  categoria: string
}) {
  const portada = imagen || COVER_FALLBACK
  const preview: Proyecto = {
    id: "preview",
    titulo: titulo || "Título del proyecto",
    slug: slug || "slug-del-proyecto",
    resumen: resumen || null,
    historia: historia || null,
    video_url: videoUrl || null,
    imagen_portada: imagen || null,
    galeria: [],
    categoria: categoria || null,
    orden: 0,
    publicado: false,
    creado_en: "",
    actualizado_en: "",
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta tipo listado de /proyectos */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portada}
            alt={preview.titulo}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            {preview.categoria && (
              <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur">
                {preview.categoria}
              </span>
            )}
            <h3 className="mt-2 font-display text-xl leading-tight text-white">
              {preview.titulo}
            </h3>
          </div>
        </div>
      </div>

      {/* Ficha tipo diálogo de /proyectos */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portada} alt={preview.titulo} className="w-full object-cover" />
        </div>

        {preview.resumen && (
          <p className="text-pretty text-lg leading-relaxed text-foreground">{preview.resumen}</p>
        )}
        {preview.historia && (
          <p className="text-pretty leading-relaxed text-muted-foreground whitespace-pre-line">
            {preview.historia}
          </p>
        )}

        {preview.video_url && (
          <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black/90">
            {preview.video_url.includes("youtube") || preview.video_url.includes("youtu.be") ? (
              <iframe
                src={preview.video_url.replace("watch?v=", "embed/")}
                title={preview.titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={preview.video_url} controls playsInline className="h-full w-full" />
            )}
          </div>
        )}

        {!preview.resumen && !preview.historia && !preview.video_url && (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Play className="h-4 w-4" />
            Así se verá la entrada en /proyectos. Completa título, resumen, historia o video para
            verla aquí.
          </p>
        )}
      </div>
    </div>
  )
}
