"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { motion } from "motion/react"
import { toast } from "sonner"
import {
  getPublicAppointments,
  requestAppointment,
  type PublicAppointment,
} from "@/app/actions/appointments"
import {
  SLOT_HOURS,
  STATUS_META,
  addDays,
  addMonths,
  dayNameShort,
  formatHour,
  formatSlotRange,
  isSameDay,
  longDate,
  monthGridDays,
  monthName,
  slotDate,
  startOfDay,
  startOfWeek,
  weekWorkingDays,
} from "@/lib/agenda"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type View = "week" | "month"
type SlotState = "aceptada" | "en_espera" | "empty" | "past"

function rangeForView(view: View, cursor: Date) {
  if (view === "week") {
    const start = startOfWeek(cursor)
    return { start, end: addDays(start, 7) }
  }
  const grid = monthGridDays(cursor)
  return { start: grid[0], end: addDays(grid[grid.length - 1], 1) }
}

export function PublicAgenda() {
  const [view, setView] = useState<View>("week")
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const { start, end } = useMemo(() => rangeForView(view, cursor), [view, cursor])

  const swrKey = useMemo(
    () => ["public-appts", start.toISOString(), end.toISOString()],
    [start, end],
  )

  const { data: appointments = [], isLoading, mutate } = useSWR(swrKey, () =>
    getPublicAppointments(start.toISOString(), end.toISOString()),
  )

  // Parse into Date + status for local matching (tz-safe by comparing day+hour).
  const parsed = useMemo(
    () => appointments.map((a: PublicAppointment) => ({ ...a, date: new Date(a.startsAt) })),
    [appointments],
  )

  function slotStatus(day: Date, hour: number): { state: SlotState; appt?: PublicAppointment } {
    const slot = slotDate(day, hour)
    if (slot.getTime() < Date.now()) return { state: "past" }
    const match = parsed.find((a) => isSameDay(a.date, day) && a.date.getHours() === hour)
    if (match?.status === "aceptada") return { state: "aceptada", appt: match }
    if (match?.status === "en_espera") return { state: "en_espera", appt: match }
    return { state: "empty" }
  }

  function onSelectSlot(day: Date, hour: number, state: SlotState) {
    if (state === "aceptada" || state === "past") return
    setSelected(slotDate(day, hour))
  }

  const label =
    view === "week"
      ? (() => {
          const days = weekWorkingDays(cursor)
          const a = days[0]
          const b = days[days.length - 1]
          return `${a.getDate()} ${monthName(a).slice(0, 3)} – ${b.getDate()} ${monthName(b).slice(0, 3)} ${b.getFullYear()}`
        })()
      : `${monthName(cursor)} ${cursor.getFullYear()}`

  function step(dir: number) {
    setCursor((c) => (view === "week" ? addDays(c, dir * 7) : addMonths(c, dir)))
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => step(-1)}
            aria-label="Anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-full border border-border px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
          >
            Hoy
          </button>
          <button
            onClick={() => step(1)}
            aria-label="Siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="ml-2 font-display text-lg font-medium text-foreground">{label}</span>
        </div>

        <div className="inline-flex rounded-full border border-border p-1">
          {(["week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <Legend dotClass={STATUS_META.aceptada.dot} label="Confirmada · no disponible" />
        <Legend dotClass={STATUS_META.en_espera.dot} label="En espera · puedes postularte" />
        <Legend dotClass="bg-border" label="Disponible" ring />
      </div>

      <div className="relative mt-6">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cargando…</span>
          </div>
        )}
        {view === "week" ? (
          <WeekGrid cursor={cursor} slotStatus={slotStatus} onSelect={onSelectSlot} />
        ) : (
          <MonthGrid cursor={cursor} parsed={parsed} onPickDay={(d) => { setView("week"); setCursor(d) }} />
        )}
      </div>

      <BookingDialog
        slot={selected}
        onClose={() => setSelected(null)}
        onBooked={() => {
          setSelected(null)
          mutate()
        }}
      />
    </div>
  )
}

function Legend({ dotClass, label, ring }: { dotClass: string; label: string; ring?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-full", dotClass, ring && "border border-border bg-transparent")} />
      {label}
    </span>
  )
}

function WeekGrid({
  cursor,
  slotStatus,
  onSelect,
}: {
  cursor: Date
  slotStatus: (day: Date, hour: number) => { state: SlotState; appt?: PublicAppointment }
  onSelect: (day: Date, hour: number, state: SlotState) => void
}) {
  const days = weekWorkingDays(cursor)
  const today = new Date()

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Header */}
        <div className="grid grid-cols-[64px_repeat(6,1fr)] gap-2">
          <div />
          {days.map((d) => {
            const isToday = isSameDay(d, today)
            return (
              <div key={d.toISOString()} className="pb-2 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {dayNameShort(d)}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full font-display text-base",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {d.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {SLOT_HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[64px_repeat(6,1fr)] gap-2">
              <div className="flex items-start justify-end pr-1 pt-2">
                <span className="font-mono text-xs text-muted-foreground">{formatHour(hour)}</span>
              </div>
              {days.map((d) => {
                const { state, appt } = slotStatus(d, hour)
                return (
                  <SlotCell
                    key={d.toISOString() + hour}
                    state={state}
                    appt={appt}
                    onClick={() => onSelect(d, hour, state)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SlotCell({
  state,
  appt,
  onClick,
}: {
  state: SlotState
  appt?: PublicAppointment
  onClick: () => void
}) {
  if (state === "past") {
    return <div className="h-16 rounded-lg border border-dashed border-border/60 bg-muted/40" aria-hidden />
  }
  if (state === "aceptada") {
    return (
      <div className="flex h-16 flex-col items-center justify-center rounded-lg bg-brand-navy text-white">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest">Confirmada</span>
        <span className="text-[0.65rem] opacity-70">Reservado</span>
      </div>
    )
  }
  if (state === "en_espera") {
    return (
      <button
        onClick={onClick}
        className="group flex h-16 flex-col items-center justify-center rounded-lg border-2 border-amber-500 bg-amber-500/10 text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
      >
        <span className="font-mono text-[0.6rem] uppercase tracking-widest">En espera</span>
        <span className="text-[0.65rem]">Postularme</span>
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="group flex h-16 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100">
        Elegir
      </span>
      <span className="h-1.5 w-1.5 rounded-full bg-border transition-opacity group-hover:opacity-0" />
    </button>
  )
}

function MonthGrid({
  cursor,
  parsed,
  onPickDay,
}: {
  cursor: Date
  parsed: (PublicAppointment & { date: Date })[]
  onPickDay: (d: Date) => void
}) {
  const days = monthGridDays(cursor)
  const today = new Date()
  const weekdayHeaders = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {weekdayHeaders.map((w) => (
          <div key={w} className="pb-1 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isSunday = d.getDay() === 0
          const isPast = startOfDay(d).getTime() < startOfDay(today).getTime()
          const dayAppts = parsed.filter((a) => isSameDay(a.date, d))
          const accepted = dayAppts.filter((a) => a.status === "aceptada").length
          const waiting = dayAppts.filter((a) => a.status === "en_espera").length
          const disabled = isSunday || isPast

          return (
            <button
              key={d.toISOString()}
              disabled={disabled}
              onClick={() => onPickDay(d)}
              className={cn(
                "flex min-h-20 flex-col rounded-lg border p-2 text-left transition-colors",
                inMonth ? "border-border bg-card" : "border-transparent bg-muted/30",
                disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary hover:bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full font-display text-sm",
                  isSameDay(d, today) ? "bg-primary text-primary-foreground" : "text-foreground",
                  !inMonth && "text-muted-foreground",
                )}
              >
                {d.getDate()}
              </span>
              {!disabled && (
                <span className="mt-auto flex items-center gap-1.5 pt-2">
                  {accepted > 0 && <span className="h-2 w-2 rounded-full bg-brand-navy" title={`${accepted} confirmadas`} />}
                  {waiting > 0 && <span className="h-2 w-2 rounded-full bg-amber-500" title={`${waiting} en espera`} />}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Selecciona un día para ver los horarios disponibles.
      </p>
    </div>
  )
}

function BookingDialog({
  slot,
  onClose,
  onBooked,
}: {
  slot: Date | null
  onClose: () => void
  onBooked: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ clientName: "", clientEmail: "", clientPhone: "", projectDescription: "" })

  const open = slot !== null

  function reset() {
    setForm({ clientName: "", clientEmail: "", clientPhone: "", projectDescription: "" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slot) return
    if (!form.clientName.trim()) {
      toast.error("Por favor escribe tu nombre.")
      return
    }
    setSubmitting(true)
    const res = await requestAppointment({
      startsAt: slot.toISOString(),
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      projectDescription: form.projectDescription,
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success("Solicitud enviada. Te confirmaremos tu cita pronto.")
      reset()
      onBooked()
    } else {
      toast.error(res.error ?? "No se pudo enviar la solicitud.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Solicitar cita</DialogTitle>
          <DialogDescription>
            {slot && (
              <span className="text-foreground">
                {longDate(slot)} · {formatSlotRange(slot.getHours())}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Tu cita quedará <strong>en espera</strong>. Confirmamos según nuestra disponibilidad; si el
          turno se cruza con otra solicitud, podríamos proponerte moverla. También puedes postularte a
          turnos que ya están en espera.
        </div>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre completo *</Label>
            <Input
              id="clientName"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              placeholder="Tu nombre"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Correo</Label>
              <Input
                id="clientEmail"
                type="email"
                value={form.clientEmail}
                onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                placeholder="tucorreo@correo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono / WhatsApp</Label>
              <Input
                id="clientPhone"
                value={form.clientPhone}
                onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                placeholder="300 000 0000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectDescription">¿Qué proyecto tienes en mente?</Label>
            <Textarea
              id="projectDescription"
              value={form.projectDescription}
              onChange={(e) => setForm((f) => ({ ...f, projectDescription: e.target.value }))}
              placeholder="Cuéntanos sobre tu espacio: cocina, closet, mueble de TV, puertas…"
              rows={4}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Enviando…" : "Enviar solicitud"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
