"use client"

import { ExternalLink, Eye, EyeOff } from "lucide-react"

export interface ProyectoPreviewProps {
  titulo: string
  slug: string
  descripcion?: string | null
  publicado?: boolean
}

// Vista previa en vivo de cómo se verá el proyecto en /portafolio y en su ficha pública.
export function ProyectoPreview({
  titulo,
  slug,
  descripcion,
  publicado = false,
}: ProyectoPreviewProps) {
  const displayTitulo = titulo.trim() || "Título del proyecto"
  const displaySlug = slug.trim() || "slug-del-proyecto"
  const displayDesc = descripcion?.trim() || "Sin descripción aún. Añade una descripción para contextualizar el proyecto."

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vista previa del proyecto
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            publicado
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {publicado ? (
            <>
              <Eye className="h-3 w-3" /> Publicado en /portafolio
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3" /> Solo visible para staff (Borrador)
            </>
          )}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-display text-xl font-medium tracking-tight text-foreground">
              {displayTitulo}
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              /portafolio/proyectos/{displaySlug}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {displayDesc}
            </p>
          </div>
          <span className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
