"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  BLOQUES,
  DIAS_CORTOS,
  fechaDeCelda,
  inicioSemana,
  slotKey,
  type CeldaGrilla,
} from "@/lib/agenda"
import { cn } from "@/lib/utils"

export type { CeldaGrilla }

export interface GrillaBloquesProps {
  /** Encabezado del rango visible, p. ej. "Semana del 12 – 18 de octubre". */
  titulo: string
  /** Una celda por (día, bloque) de la semana, vía `celdasDeSemana`. */
  celdas: CeldaGrilla[]
  onAnterior?: () => void
  onSiguiente?: () => void
  onHoy?: () => void
  cargando?: boolean
  /** Columnas de día; por defecto Lun–Sáb (`DIAS_CORTOS`). */
  dias?: readonly { readonly dow: number; readonly label: string }[]
  /** Cada página pinta el contenido de su celda (children pattern). */
  renderCelda: (celda: CeldaGrilla) => ReactNode
}

// Tintados por estado del bloque. Solo tokens semánticos: la grilla sirve al
// flujo público (modo claro) y al de staff (tema oscuro) sin duplicar layout.
function clasesEstado(celda: CeldaGrilla): string {
  if (celda.pasado) return "bg-input/40"
  switch (celda.estado) {
    case "aceptada":
      return "bg-primary/5"
    case "en_espera":
      return "bg-secondary/30"
    case "cancelada":
      return "bg-destructive/5"
    default:
      return ""
  }
}

// Retícula compartida de la agenda: 1 columna de hora + N columnas de día
// (Lun–Sáb por defecto), una fila por bloque. Es la misma que usaba el
// calendario público; staff ahora se apoya en ella en lugar de mantener su
// propia parrilla de 7 columnas con aritmética de zona horaria distinta.
export function GrillaBloques({
  titulo,
  celdas,
  onAnterior,
  onSiguiente,
  onHoy,
  cargando = false,
  dias = DIAS_CORTOS,
  renderCelda,
}: GrillaBloquesProps) {
  // Las celdas viven indexadas por su `slotKey` (UTC): así la retícula se
  // reconstruye igual aunque el consumidor reordene o filtre el array.
  const porClave = useMemo(() => new Map(celdas.map((c) => [c.clave, c])), [celdas])
  // El lunes sale de la propia semana de las celdas: la grilla no necesita
  // recibirlo aparte.
  const lunes = useMemo(
    () => (celdas.length > 0 ? inicioSemana(celdas[0].fecha) : null),
    [celdas],
  )
  const columnas = `4rem repeat(${dias.length}, minmax(0, 1fr))`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAnterior}
          disabled={!onAnterior}
          aria-label="Semana anterior"
          className="rounded-full border border-border p-2 text-primary transition hover:bg-input active:scale-95 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-primary" aria-live="polite">
            {titulo}
          </p>
          {onHoy && (
            <button
              type="button"
              onClick={onHoy}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:bg-input active:scale-95"
            >
              Hoy
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={!onSiguiente}
          aria-label="Semana siguiente"
          className="rounded-full border border-border p-2 text-primary transition hover:bg-input active:scale-95 disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {cargando && (
        <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
          Consultando disponibilidad…
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Encabezados de día */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: columnas }}>
          <div aria-hidden />
          {dias.map((dia) => {
            const fecha = lunes
              ? new Date(
                  Date.UTC(
                    lunes.getUTCFullYear(),
                    lunes.getUTCMonth(),
                    lunes.getUTCDate() + (dia.dow - 1),
                  ),
                )
              : null
            return (
              <div key={dia.dow} className="px-2 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50">
                  {dia.label}
                </p>
                {fecha && (
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {fecha.getUTCDate()}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Filas por bloque horario */}
        {BLOQUES.map((bloque) => (
          <div
            key={bloque.inicio}
            className="grid border-b border-border last:border-b-0"
            style={{ gridTemplateColumns: columnas }}
          >
            <div className="flex items-center justify-center border-r border-border px-1 text-[10px] text-primary/50">
              {bloque.inicio}
            </div>

            {dias.map((dia) => {
              const celda = lunes
                ? porClave.get(slotKey(fechaDeCelda(lunes, dia.dow, bloque.inicio)))
                : undefined

              // Día no laborable (domingo si se piden 7 columnas) o semana sin
              // datos: celda muerta, sin contenido interactivo.
              if (!celda || !celda.laborable) {
                return (
                  <div
                    key={dia.dow}
                    className="min-h-14 border-r border-border bg-input/60 last:border-r-0"
                  />
                )
              }

              return (
                <div
                  key={dia.dow}
                  className={cn(
                    "border-r border-border p-1 last:border-r-0",
                    clasesEstado(celda),
                  )}
                >
                  {renderCelda(celda)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
