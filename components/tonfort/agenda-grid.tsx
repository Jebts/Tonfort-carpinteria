"use client"

import { Fragment, useMemo } from "react"
import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import {
  BLOQUES,
  DIAS_LABORALES,
  DURACION_MINUTOS,
  formatearHora,
  generarSlots,
  slotEnPasado,
  slotKey,
} from "@/lib/agenda"
import {
  dotColor,
  estadoVisual,
  estiloEstado,
  estiloEstadoVisual,
  ESTADO_ESTILO,
  type EstadoVisual,
} from "@/lib/estados"
import type { DisponibilidadSlot, CitaEnSlot } from "@/lib/citas-service"
import type { EstadoSlot } from "@/lib/supabase/types"
import { cn } from "@/lib/utils"

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function waMeUrl(telefono?: string | null): string | null {
  if (!telefono) return null
  const limpio = telefono.replace(/[^\d]/g, "")
  if (!limpio) return null
  return `https://wa.me/${limpio}`
}

function citasVisibles(
  citas: CitaEnSlot[],
  opts: { modo: "publico" | "staff"; soloAceptadas: boolean; mostrarCanceladas: boolean },
): CitaEnSlot[] {
  let lista = citas
  if (opts.modo === "publico") {
    lista = lista.filter((c) => {
      const v = estadoVisual(c)
      return v !== "cancelada"
    })
  } else {
    if (!opts.mostrarCanceladas) {
      lista = lista.filter((c) => estadoVisual(c) !== "cancelada")
    }
    if (opts.soloAceptadas) {
      lista = lista.filter((c) => estadoVisual(c) === "aceptada")
    }
  }
  return lista
}

export interface AgendaGridProps {
  slots: DisponibilidadSlot[]
  modo: "publico" | "staff"
  referencia?: Date
  onSlotClick?: (fecha: Date) => void
  soloAceptadas?: boolean
  mostrarCanceladas?: boolean
  onEditarCita?: (citaId: string) => void
}

export function AgendaGrid({
  slots,
  modo,
  referencia,
  onSlotClick,
  soloAceptadas = false,
  mostrarCanceladas = true,
  onEditarCita,
}: AgendaGridProps) {
  const inicio = startOfWeek(referencia ?? new Date(), { weekStartsOn: 1 })
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)

  const mapaEstados = useMemo(() => {
    const m = new Map<string, DisponibilidadSlot>()
    for (const s of slots) m.set(slotKey(new Date(s.fecha_hora)), s)
    return m
  }, [slots])

  const diasSemana = useMemo(
    () => eachDayOfInterval({ start: inicio, end: fin }),
    [inicio, fin],
  )

  return (
    <div className="overflow-auto max-h-[60vh]">
      <div className="min-w-[760px] grid grid-cols-[80px_repeat(7,1fr)] gap-x-2 gap-y-2 items-start">
        <div className="flex h-[38px] items-center justify-center bg-background text-muted-foreground font-mono text-xs uppercase tracking-widest border-b border-border">
          <span className="relative z-10">{format(inicio, 'd MMM', { locale: es })}</span>
          <span className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/80 to-transparent pointer-events-none" />
        </div>
        {diasSemana.map((dia, i) => (
          <div key={i} className="sticky top-0 z-20 flex h-[38px] items-center justify-center bg-background text-center border-b border-border">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {DIAS_SEMANA[(dia.getDay() + 6) % 7]}
              </p>
              <p className="mt-1 text-sm font-medium">
                {format(dia, "d MMM", { locale: es })}
              </p>
            </div>
          </div>
        ))}

        {BLOQUES.map((bloque) => (
          <Fragment key={bloque.inicio}>
            <div className={cn("flex items-center justify-end pr-3 font-mono min-h-[76px] bg-background text-muted-foreground self-start backface-hidden transform", modo === "staff" ? "py-2.5 text-sm" : "py-2 text-xs")}>
              <span className="relative z-10">{bloque.label.split(" – ")[0]}</span>
              <span className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/80 to-transparent pointer-events-none" />
            </div>
            {diasSemana.map((dia, i) => {
              const slotDate = new Date(dia)
              const [h, m] = bloque.inicio.split(":").map(Number)
              slotDate.setHours(h, m, 0, 0)
              const slot = mapaEstados.get(slotKey(slotDate))
              const estado = slot?.estado ?? "vacio"
              const pasado = slotEnPasado(slotDate)
              const diaLaboral = DIAS_LABORALES.includes(dia.getDay())
              const visibles = citasVisibles(slot?.citas ?? [], {
                modo,
                soloAceptadas,
                mostrarCanceladas,
              })
              const hayAceptadas = visibles.length > 0
              const celdaEsBoton = !(modo === "staff" && soloAceptadas)
              const clickable =
                !pasado &&
                diaLaboral &&
                (modo === "staff"
                  ? true
                  : estado !== "aceptada")
              const estilo = estiloEstado(estado)

              const citasEnSlot = slot?.citas ?? []
              const hasAceptada = citasEnSlot.some(
                (c) => estadoVisual(c) === "aceptada",
              )
              const hasEspera = citasEnSlot.some(
                (c) => estadoVisual(c) === "en_espera",
              )
              const hasCancelada = citasEnSlot.some(
                (c) => estadoVisual(c) === "cancelada",
              )

              let staffCellClasses = "border-border bg-card"
              let mixedDot: React.ReactNode = null

              if (hasAceptada && hasEspera) {
                staffCellClasses =
                  "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-600"
                mixedDot = (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-black/5" />
                )
              } else if (hasAceptada) {
                staffCellClasses = ESTADO_ESTILO.aceptada.className
              } else if (hasEspera) {
                staffCellClasses = ESTADO_ESTILO.en_espera.className
              } else if (hasCancelada && mostrarCanceladas) {
                staffCellClasses = ESTADO_ESTILO.cancelada.className
              }

              const contenido =
                modo === "publico" ? (
                  <>
                    {(estado !== "vacio" || clickable) && (
                      <span className="font-mono uppercase tracking-wide truncate">
                        {estilo.label}
                      </span>
                    )}
                    {estado !== "vacio" && estado !== "aceptada" && (
                      <span className="mt-1 line-clamp-2 opacity-80">
                        {slot?.citas[0]?.nombre ?? ""}
                      </span>
                    )}
                  </>
                ) : soloAceptadas ? (
                  hayAceptadas ? (
                    <SlotAceptadas citas={visibles} onEditarCita={onEditarCita} />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      —
                    </span>
                  )
                ) : (
                  <SlotDots citas={visibles} />
                )

              const clasesCelda = cn(
                "flex min-h-[76px] flex-col items-start justify-center gap-1.5 rounded-lg border text-left transition-colors overflow-hidden",
                modo === "staff" ? "px-3 py-2.5 text-sm" : "px-2.5 py-2 text-xs",
                modo === "publico" ? estilo.className : staffCellClasses,
                celdaEsBoton && clickable && "cursor-pointer hover:border-foreground hover:bg-muted/40",
                !celdaEsBoton && "cursor-default",
                !clickable && "cursor-not-allowed opacity-60",
                !clickable && estado === "vacio" && modo === "publico" && "bg-muted/35 text-transparent",
              )

              if (celdaEsBoton) {
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!clickable}
                    onClick={() => {
                      if (clickable && hasAceptada && hasEspera) {
                        toast.warning(
                          "Hay citas en espera que deben ser reprogramadas",
                          {
                            description:
                              "Este bloque tiene citas en espera y una cita aceptada.",
                          },
                        )
                      }
                      clickable && onSlotClick?.(slotDate)
                    }}
                    className={clasesCelda}
                  >
                    {contenido}
                    {mixedDot}
                  </button>
                )
              }

              return (
                <div key={i} className={clasesCelda}>
                  {contenido}
                  {mixedDot}
                </div>
              )
            })}
            </Fragment>
          ))}
      </div>
    </div>
  )
}

function SlotDots({ citas }: { citas: CitaEnSlot[] }) {
  if (citas.length === 0) {
    return <span className="text-[11px] uppercase tracking-wide text-muted-foreground">libre</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {citas.map((c) => {
        const v: EstadoVisual = estadoVisual(c)
        return (
          <span
            key={c.id}
            title={c.nombre ?? estiloEstadoVisual(v).label}
            className={cn("h-3.5 w-3.5 rounded-full ring-1 ring-black/5", dotColor(v))}
          />
        )
      })}
    </div>
  )
}

function SlotAceptadas({
  citas,
  onEditarCita,
}: {
  citas: CitaEnSlot[]
  onEditarCita?: (citaId: string) => void
}) {
  return (
    <ul className="w-full space-y-1.5 overflow-hidden">
      {citas.slice(0, 2).map((c) => {
        const v: EstadoVisual = estadoVisual(c)
        const wa = waMeUrl(c.telefono)
        const meet = c.meet_link?.trim() || null
        return (
          <li key={c.id} className="card-hover rounded border border-border bg-background/60 p-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium">{c.nombre ?? "Sin nombre"}</span>
              {onEditarCita && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditarCita(c.id)
                  }}
                  className="press shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Editar cita"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px]">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                >
                  WhatsApp
                </a>
              )}
              {meet && (
                <a
                  href={meet}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                >
                  Meet
                </a>
              )}
              {!wa && !meet && (
                <span className={cn("text-[11px] uppercase", dotColor(v))}>●</span>
              )}
            </div>
          </li>
        )
      })}
      {citas.length > 2 && (
        <li className="text-center text-[11px] text-muted-foreground">+{citas.length - 2} más</li>
      )}
    </ul>
  )
}

export function DiaSlots({
  dia,
  slots,
  onSlotClick,
}: {
  dia: Date
  slots: DisponibilidadSlot[]
  onSlotClick?: (fecha: Date) => void
}) {
  const mapaEstados = useMemo(() => {
    const m = new Map<string, DisponibilidadSlot>()
    for (const s of slots) m.set(slotKey(new Date(s.fecha_hora)), s)
    return m
  }, [slots])

  const estadoPara = (f: Date): EstadoSlot => {
    const s = mapaEstados.get(slotKey(f))
    return s?.estado ?? "vacio"
  }

  const slotsDelDia = useMemo(() => {
    const inicio = startOfDay(dia)
    const fin = new Date(inicio)
    fin.setHours(23, 59, 59, 999)
    return generarSlots(inicio, fin)
  }, [dia])

  return (
    <div>
      <h3 className="mb-4 font-display text-xl capitalize text-foreground">
        {format(dia, "EEEE d 'de' MMMM", { locale: es })}
      </h3>
      <div className="space-y-2">
        {slotsDelDia.map((f, i) => {
          const estado = estadoPara(f)
          const pasado = slotEnPasado(f)
          const clickable =
            !pasado && estado !== "aceptada" && DIAS_LABORALES.includes(f.getDay())
          const estilo = estiloEstado(estado)
          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSlotClick?.(f)}
              className={cn(
                "flex h-12 w-full items-center justify-between rounded-lg border px-3 text-left text-sm transition-colors overflow-hidden",
                estilo.className,
                clickable && "cursor-pointer",
                !clickable && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="font-mono">
                {formatearHora(f)} –{" "}
                {format(new Date(f.getTime() + DURACION_MINUTOS * 60000), "HH:mm")}
              </span>
              <span className="font-mono text-xs uppercase tracking-wide">{estilo.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function LeyendaEstados() {
  const items: EstadoVisual[] = ["en_espera", "aceptada", "cancelada"]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((v) => (
        <span key={v} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", dotColor(v))} />
          {estiloEstadoVisual(v).label}
        </span>
      ))}
    </div>
  )
}
