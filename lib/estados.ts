import type { EstadoCita, EstadoSlot } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

export type EstadoVisual = "en_espera" | "aceptada" | "cancelada"

// Mapa de estados de cita/slot → clases de color (borde, fondo, texto) y etiqueta.
// Aplicar en agenda pública y staff.

interface EstiloEstado {
  label: string
  // Clases para una celda/slot.
  className: string
  // Color sólido para badges/insignias.
  badge: string
  // Clase de la "pelotita" (punto de color por cita).
  dot: string
}

export type EstadoColor = EstadoSlot

export const ESTADO_ESTILO: Record<EstadoColor, EstiloEstado> = {
  vacio: {
    label: "Disponible",
    className: "border-border bg-transparent text-muted-foreground hover:border-foreground hover:bg-muted/40",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/40",
  },
  en_espera: {
    label: "En espera",
    className: "border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-600 border-amber-500 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  aceptada: {
    label: "Agendada",
    className: "border-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    className: "border-rose-500 bg-gradient-to-r from-rose-500/10 to-transparent text-rose-600 dark:text-rose-400 line-through opacity-70",
    badge: "bg-rose-500/15 text-rose-600 border-rose-500 dark:text-rose-400",
    dot: "bg-rose-500",
  },
}

export function estiloEstado(estado: EstadoSlot): EstiloEstado {
  return ESTADO_ESTILO[estado] ?? ESTADO_ESTILO.vacio
}

export function estiloEstadoVisual(estado: EstadoVisual): EstiloEstado {
  return ESTADO_ESTILO[estado] ?? ESTADO_ESTILO.vacio
}

// Color sólido de la pelotita para un estado visual.
export function dotColor(estado: EstadoVisual): string {
  return estiloEstadoVisual(estado).dot
}

export function estadoVisual(cita: { estado: EstadoCita; movida: boolean }): EstadoVisual {
  return cita.estado
}

// Para la agenda staff, combina el estado base con la marca de "movida".
export function etiquetaCita(estado: EstadoCita, movida: boolean): string {
  const visual = estadoVisual({ estado, movida })
  return estiloEstadoVisual(visual).label
}

export { cn }
