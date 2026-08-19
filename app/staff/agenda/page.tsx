"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addWeeks,
  addMonths,
  format,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { Check, Pencil, Plus, Trash2, X, ArrowLeft, CalendarDays, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  AgendaGrid,
  LeyendaEstados,
} from "@/components/tonfort/agenda-grid"
import {
  estadoVisual,
  estiloEstadoVisual,
  etiquetaCita,
} from "@/lib/estados"
import {
  DURACION_MINUTOS,
  formatearHora,
  slotEnPasado,
  slotKey,
} from "@/lib/agenda"
import type { DisponibilidadSlot, CitaEnSlot } from "@/lib/citas-service"
import { accionCita, eliminarCita, getCitas, guardarCita } from "@/lib/staff-client"
import { cn } from "@/lib/utils"
import { CitaForm } from "@/components/tonfort/staff/cita-form"
import { useRouter } from "next/navigation"
import type { Cita } from "@/lib/supabase/types"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

function StaffAgendaPageInner() {
  const [slots, setSlots] = useState<DisponibilidadSlot[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [cargando, setCargando] = useState(true)
  const [referencia, setReferencia] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const [fechaActiva, setFechaActiva] = useState<Date | null>(null)
  const [modoModal, setModoModal] = useState<"detalle" | "mover" | "crear">("detalle")
  const [citaMoviendo, setCitaMoviendo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [creandoEn, setCreandoEn] = useState<Date | null>(null)
  const [cliente, setCliente] = useState("")
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const wideRangeRef = useRef(false)
  const [confirmarAceptar, setConfirmarAceptar] = useState<CitaEnSlot | null>(null)

  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const u = params.get("cliente") || ""
    setCliente(u)
    setBusquedaCliente(u)
    wideRangeRef.current = false
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const inicio = startOfWeek(referencia, { weekStartsOn: 1 })
      const fin = new Date(inicio)
      fin.setDate(fin.getDate() + 6)
      fin.setHours(23, 59, 59, 999)

      let desde: Date
      let hasta: Date

      if (cliente && !wideRangeRef.current) {
        desde = subMonths(new Date(), 12)
        hasta = addMonths(new Date(), 12)
      } else {
        desde = inicio
        hasta = fin
      }

      const data = await getCitas(desde, hasta, cliente || undefined)
      const slotsData = data.slots as DisponibilidadSlot[]
      const filteredSlots = cliente
        ? slotsData.filter((s) =>
            s.citas.some((c) => c.nombre && c.nombre.toLowerCase().includes(cliente.toLowerCase())),
          )
        : slotsData
      setSlots(filteredSlots)
      setCitas((data as { citas: Cita[] }).citas ?? [])
      wideRangeRef.current = true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [referencia, cliente])

  useEffect(() => {
    cargar()
  }, [cargar])

  const limpiarFiltro = () => {
    setCliente("")
    setBusquedaCliente("")
    router.push("/staff/agenda")
  }

  const mapa = useMemo(() => {
    const m = new Map<string, DisponibilidadSlot>()
    for (const s of slots) m.set(slotKey(new Date(s.fecha_hora)), s)
    return m
  }, [slots])

  const slotActivo = fechaActiva ? mapa.get(slotKey(fechaActiva)) ?? null : null

  const doAccion = async (
    id: string,
    accion: "aceptar" | "cancelar" | "mover" | "eliminar" | "reenviar",
    fecha?: string,
  ) => {
    try {
      if (accion === "eliminar") {
        await eliminarCita(id)
        toast.success("Eliminada")
      } else {
        await accionCita(id, accion, fecha)
        toast.success(
          accion === "aceptar"
            ? "Cita aceptada"
            : accion === "cancelar"
              ? "Cita cancelada"
              : accion === "reenviar"
                ? "Marcada como en espera"
                : "Cita reprogramada",
        )
      }
      await cargar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar")
    }
  }

  const aceptar = async (c: CitaEnSlot) => {
    const yaAceptadas = (slotActivo?.citas ?? []).filter((x) => {
      const v = estadoVisual(x)
      return v === "aceptada"
    }).length
    if (yaAceptadas >= 1) {
      setConfirmarAceptar(c)
      return
    }
    await doAccion(c.id, "aceptar")
  }

  const reenviar = async (id: string) => {
    await doAccion(id, "reenviar")
  }

  const iniciarMover = (id: string) => {
    setCitaMoviendo(id)
    setModoModal("mover")
  }

  const confirmarMover = async (fecha: Date) => {
    if (!citaMoviendo) return
    if (slotEnPasado(fecha)) {
      toast.error("No puedes mover a un horario pasado")
      return
    }
    const destino = mapa.get(slotKey(fecha))
    if (destino?.citas.some((c) => estadoVisual(c) === "aceptada")) {
      toast.error("No puedes mover a un bloque que ya tiene una cita confirmada")
      return
    }
    await doAccion(citaMoviendo, "mover", fecha.toISOString())
    setCitaMoviendo(null)
    setModoModal("detalle")
    setFechaActiva(null)
  }

  const abrirCrearEn = (fecha: Date) => {
    setCreandoEn(fecha)
    setModoModal("crear")
  }

  const cerrarCrear = () => {
    setCreandoEn(null)
    setModoModal("detalle")
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="press" onClick={() => setReferencia((r) => addWeeks(r, -1))}>
            Anterior
          </Button>
          <Button variant="outline" className="press" onClick={() => setReferencia((r) => addWeeks(r, 1))}>
            Siguiente
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const term = e.currentTarget.value.trim()
                if (term) {
                  setCliente(term)
                  router.push(`/staff/agenda?cliente=${encodeURIComponent(term)}`)
                }
              }
            }}
            placeholder="Buscar cliente para filtrar citas…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
        {cliente && (
          <Button variant="outline" className="press" onClick={limpiarFiltro}>
            <XCircle className="mr-2 h-4 w-4" /> Limpiar filtro
          </Button>
        )}
      </div>

      {cliente && citas.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
             Citas de {cliente} ({citas.length})
          </h2>
          <div className="mt-4 space-y-2">
            {citas.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                  estiloEstadoVisual(estadoVisual(c)).className,
                )}
              >
                <div>
                  <p className="font-medium">
                    {c.nombre_solicitante ?? c.email ?? "Sin nombre"}
                  </p>
                  <p className="text-xs opacity-80">
                    {format(new Date(c.fecha_hora), "EEEE d 'de' MMMM yyyy · HH:mm", { locale: es })}
                  </p>
                  {c.descripcion && (
                    <p className="mt-1 text-sm opacity-90">{c.descripcion}</p>
                  )}
                </div>
                <Badge className={cn("border", estiloEstadoVisual(estadoVisual(c)).badge)}>
                  {etiquetaCita(c.estado, c.movida)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {cliente && citas.length === 0 && !cargando && (
        <p className="mt-6 text-sm text-muted-foreground">
          No se encontraron citas para &quot;{cliente}&quot;.
        </p>
      )}

      <div className="mt-4">
        <LeyendaEstados />
      </div>

      {cargando ? (
        <p className="mt-10 text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-6">
          <AgendaGrid
            slots={slots}
            modo="staff"
            referencia={referencia}
            onSlotClick={(f) => {
              setFechaActiva(f)
              setModoModal("detalle")
            }}
          />
        </div>
      )}

      <Dialog
        open={!!fechaActiva}
        onOpenChange={(o) => {
          if (!o) {
            setFechaActiva(null)
            setModoModal("detalle")
            setCitaMoviendo(null)
            setCreandoEn(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {fechaActiva
                ? `${format(fechaActiva, "EEEE d 'de' MMMM", { locale: es })} · ${formatearHora(fechaActiva)} – ${format(
                    new Date(fechaActiva.getTime() + DURACION_MINUTOS * 60000),
                    "HH:mm",
                  )}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          {modoModal === "mover" ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setModoModal("detalle")}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Volver
                </Button>
                <span className="text-sm text-muted-foreground">
                  Elige el nuevo bloque para la cita.
                </span>
              </div>
              <AgendaGrid
                slots={slots}
                modo="staff"
                referencia={referencia}
                onSlotClick={confirmarMover}
              />
            </div>
          ) : modoModal === "crear" && fechaActiva ? (
            <CitaForm
              fechaHora={fechaActiva}
              onCancel={cerrarCrear}
              onSave={async (form) => {
                try {
                  await guardarCita(form)
                  toast.success("Cita creada")
                  cerrarCrear()
                  setFechaActiva(null)
                  cargar()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo crear")
                }
              }}
            />
          ) : (
            slotActivo && (
              <SlotDetalle
                slot={slotActivo}
                onAceptar={aceptar}
                onMover={iniciarMover}
                onCancelar={(id) => doAccion(id, "cancelar")}
                onEliminar={(id) => doAccion(id, "eliminar")}
                onReenviar={reenviar}
                onCrearEn={abrirCrearEn}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={creando} onOpenChange={setCreando}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nueva cita (interna)</DialogTitle>
          </DialogHeader>
          <CitaForm
            onCancel={() => setCreando(false)}
            onSave={async (form) => {
              try {
                await guardarCita(form)
                toast.success("Cita creada")
                setCreando(false)
                cargar()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudo crear")
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmarAceptar}
        title="Bloque ya confirmado"
        description="Este bloque ya tiene una cita confirmada. ¿Seguro que quieres aceptar otra?"
        confirmLabel="Aceptar otra"
        onConfirm={async () => {
          if (confirmarAceptar) await doAccion(confirmarAceptar.id, "aceptar")
        }}
        onOpenChange={(o) => !o && setConfirmarAceptar(null)}
      />
    </div>
  )
}

export default function StaffAgendaPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-muted-foreground">Cargando…</p>}>
      <StaffAgendaPageInner />
    </Suspense>
  )
}

const SECCIONES: { titulo: string; estados: string[] }[] = [
  { titulo: "En espera", estados: ["en_espera"] },
  { titulo: "Aceptadas", estados: ["aceptada"] },
  { titulo: "Canceladas", estados: ["cancelada"] },
]

function SlotDetalle({
  slot,
  onAceptar,
  onMover,
  onCancelar,
  onEliminar,
  onReenviar,
  onCrearEn,
}: {
  slot: DisponibilidadSlot
  onAceptar: (c: CitaEnSlot) => void
  onMover: (id: string) => void
  onCancelar: (id: string) => void
  onEliminar: (id: string) => void
  onReenviar: (id: string) => void
  onCrearEn: (fecha: Date) => void
}) {
  const fechaSlot = new Date(slot.fecha_hora)
  const bloquePasado = slotEnPasado(fechaSlot)

  return (
    <div className="space-y-5">
      {SECCIONES.map((sec) => {
        const citas = slot.citas.filter((c) => sec.estados.includes(estadoVisual(c)))
        if (citas.length === 0) return null
        return (
          <div key={sec.titulo}>
            <h3 className="mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {sec.titulo} ({citas.length})
            </h3>
            <div className="space-y-2">
              {citas.map((c) => {
                const estilo = estiloEstadoVisual(estadoVisual(c))
                const esAceptada = estadoVisual(c) === "aceptada"
                return (
                  <div key={c.id} className={cn("rounded-xl border p-3", estilo.className)}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {c.nombre ?? c.email ?? "Sin nombre"}
                        </p>
                        <p className="text-xs opacity-80">
                          {[c.email, c.telefono].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Badge className={cn("border", estilo.badge)}>
                        {etiquetaCita(c.estado, c.movida)}
                      </Badge>
                    </div>

                    {c.descripcion && (
                      <p className="mt-2 text-sm opacity-90">{c.descripcion}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!esAceptada && (
                        <Button size="sm" variant="outline" className="press" onClick={() => onAceptar(c)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Aceptar
                        </Button>
                      )}
                      {estadoVisual(c) === "aceptada" || estadoVisual(c) === "en_espera" ? (
                        <>
                          <Button size="sm" variant="outline" className="press" onClick={() => onMover(c.id)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Mover
                          </Button>
                          {estadoVisual(c) === "aceptada" && (
                            <Button size="sm" variant="outline" className="press" onClick={() => onCancelar(c.id)}>
                              <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                            </Button>
                          )}
                        </>
                      ) : null}
                      {estadoVisual(c) === "cancelada" && (
                        <Button size="sm" variant="outline" className="press" onClick={() => onReenviar(c.id)}>
                          En espera
                        </Button>
                      )}
                      {(estadoVisual(c) === "cancelada" || estadoVisual(c) === "en_espera") && (
                        <Button size="sm" variant="ghost" className="press" onClick={() => onEliminar(c.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="pt-2">
        <Button className="press" onClick={() => onCrearEn(fechaSlot)} disabled={bloquePasado}>
          <Plus className="mr-2 h-4 w-4" /> Agregar cita en este bloque
        </Button>
        {bloquePasado && (
          <p className="mt-1 text-xs text-muted-foreground">No se puede crear una cita en un bloque pasado.</p>
        )}
      </div>
    </div>
  )
}
