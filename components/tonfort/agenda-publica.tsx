"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DIAS_LABORALES, slotEnPasado } from "@/lib/agenda"
import { AgendaGrid, DiaSlots } from "@/components/tonfort/agenda-grid"
import type { DisponibilidadSlot } from "@/lib/citas-service"

const formSchema = z.object({
  nombre: z.string().min(2, "Escribe tu nombre").max(120),
  email: z.string().email("Email no válido"),
  telefono: z.string().min(5, "Teléfono no válido").max(40),
  ciudad: z.string().max(80).optional(),
  descripcion: z.string().min(5, "Cuéntanos un poco del proyecto").max(2000),
})
type FormValues = z.infer<typeof formSchema>

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function AgendaPublica() {
  const [modo, setModo] = useState<"semanal" | "mensual">("semanal")
  const [referencia, setReferencia] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [mes, setMes] = useState<Date>(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<DisponibilidadSlot[]>([])
  const [cargando, setCargando] = useState(false)

  const [slotActivo, setSlotActivo] = useState<Date | null>(null)
  const [enviando, setEnviando] = useState(false)

  const rango = useMemo(() => {
    if (modo === "semanal") {
      const inicio = startOfWeek(referencia, { weekStartsOn: 1 })
      const fin = endOfWeek(referencia, { weekStartsOn: 1 })
      return { desde: inicio, hasta: fin }
    }
    const inicio = startOfMonth(mes)
    const fin = endOfMonth(mes)
    return { desde: inicio, hasta: fin }
  }, [modo, referencia, mes])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({
        desde: rango.desde.toISOString(),
        hasta: rango.hasta.toISOString(),
      })
      const res = await fetch(`/api/citas?${params.toString()}`)
      if (!res.ok) throw new Error("No se pudo cargar la agenda")
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      toast.error("No pudimos cargar la disponibilidad. Intenta de nuevo.")
      setSlots([])
    } finally {
      setCargando(false)
    }
  }, [rango])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Días del mes con alguna cita (para marcar en el calendario)
  const diasConCita = useMemo(() => {
    const set = new Set<string>()
    for (const s of slots) {
      if (s.estado !== "vacio") {
        const d = new Date(s.fecha_hora)
        set.add(format(d, "yyyy-MM-dd"))
      }
    }
    return set
  }, [slots])

  const seleccionarSlot = (fecha: Date) => {
    setSlotActivo(fecha)
  }

  const diasSemana = useMemo(
    () => eachDayOfInterval({ start: rango.desde, end: rango.hasta }),
    [rango],
  )

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className="flex flex-col items-start justify-between gap-6 pt-36 md:pt-40 lg:pt-44">
        <div>
          <p className="eyebrow text-muted-foreground">Agenda</p>
          <h1 className="display-md mt-4 max-w-3xl text-balance font-display text-foreground">
            Elige el espacio para conversar de tu proyecto.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Reserva un turno de 2 horas. También puedes elegir espacios en espera: por criterios
            internos decidimos a quién atendemos en ese turno, así que si varios lo solicitan,
            confirmamos al que mejor encaje con el proyecto.
          </p>
        </div>

        <Tabs value={modo} onValueChange={(v) => setModo(v as "semanal" | "mensual")}>
          <TabsList>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensual">Mensual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-10 pb-28">
        {cargando && <p className="text-sm text-muted-foreground">Cargando disponibilidad…</p>}

        {modo === "semanal" ? (
          <AgendaGrid
            slots={slots}
            modo="publico"
            referencia={referencia}
            onSlotClick={seleccionarSlot}
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <Calendar
                mode="single"
                month={mes}
                onMonthChange={setMes}
                selected={diaSeleccionado}
                onSelect={(d) => {
                  if (d && DIAS_LABORALES.includes(d.getDay()) && !isBefore(d, startOfDay(new Date()))) {
                    setDiaSeleccionado(d)
                  }
                }}
                disabled={(d) =>
                  !DIAS_LABORALES.includes(d.getDay()) ||
                  isBefore(d, startOfDay(new Date()))
                }
                modifiers={{ conCita: (d) => diasConCita.has(format(d, "yyyy-MM-dd")) }}
                modifiersClassNames={{
                  conCita:
                    "after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-500",
                }}
                className="rounded-xl border border-border p-3"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Los días con un punto ámbar tienen al menos un turno solicitado.
              </p>
            </div>

            <div>
              {!diaSeleccionado ? (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  Selecciona un día del calendario para ver sus turnos.
                </div>
              ) : (
                <DiaSlots
                  dia={diaSeleccionado}
                  slots={slots}
                  onSlotClick={seleccionarSlot}
                />
              )}
            </div>
          </div>
        )}

        {/* Navegación de periodo (semanal/mensual) */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              modo === "semanal"
                ? setReferencia((r) => addWeeks(r, -1))
                : setMes((m) => addMonths(m, -1))
            }
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              modo === "semanal"
                ? setReferencia((r) => addWeeks(r, 1))
                : setMes((m) => addMonths(m, 1))
            }
          >
            Siguiente
          </Button>
        </div>
      </div>

      <DialogSlot
        slot={slotActivo}
        enviando={enviando}
        onClose={() => setSlotActivo(null)}
        onEnviar={async ({ ciudad, ...rest }) => {
          if (!slotActivo) return
          if (slotEnPasado(slotActivo)) {
            toast.error("Ese horario ya pasó. Elige otro turno.")
            return
          }
          setEnviando(true)
          try {
            const res = await fetch("/api/citas", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                ...rest,
                fecha_hora: slotActivo.toISOString(),
                info_personal: ciudad ? { ciudad } : {},
              }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error ?? "No se pudo agendar")
            }
            toast.success("¡Solicitud enviada! Te confirmaremos pronto por los medios que nos diste.")
            setSlotActivo(null)
            cargar()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo agendar")
          } finally {
            setEnviando(false)
          }
        }}
      />
    </div>
  )
}

function DialogSlot({
  slot,
  enviando,
  onClose,
  onEnviar,
}: {
  slot: Date | null
  enviando: boolean
  onClose: () => void
  onEnviar: (values: FormValues) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  useEffect(() => {
    if (slot) reset()
  }, [slot, reset])

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {slot ? "Reservar turno" : ""}
          </DialogTitle>
          <DialogDescription>
            {slot
              ? `${format(slot, "EEEE d 'de' MMMM", { locale: es })} · ${format(
                  slot,
                  "HH:mm",
                  { locale: es },
                )} – ${format(
                  new Date(slot.getTime() + 120 * 60000),
                  "HH:mm",
                  { locale: es },
                )}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onEnviar)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-rose-600">{errors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" {...register("telefono")} />
              {errors.telefono && <p className="text-xs text-rose-600">{errors.telefono.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ciudad">Ciudad (opcional)</Label>
            <Input id="ciudad" {...register("ciudad")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Cuéntanos de tu proyecto</Label>
            <Textarea id="descripcion" rows={4} {...register("descripcion")} />
            {errors.descripcion && <p className="text-xs text-rose-600">{errors.descripcion.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
