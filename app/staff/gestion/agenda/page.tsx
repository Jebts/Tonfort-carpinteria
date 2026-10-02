"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Plus, User, Clock, MapPin, AlertCircle, CheckCircle, XCircle, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO, startOfDay, endOfDay, addDays, differenceInMinutes, isWithinInterval, isBefore } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getCitas, accionCita, guardarCita, getClientes } from "@/lib/staff-client"
import type { Cita, Cliente, SlotAgenda } from "@/lib/supabase/types"
import { toast } from "sonner"

const COLORES_ESTADO: Record<string, string> = {
  en_espera: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aceptada: "bg-green-100 text-green-800 border-green-200",
  cancelada: "bg-red-100 text-red-800 border-red-200",
}

const COLORES_ORIGEN: Record<string, string> = {
  web: "bg-blue-100 text-blue-800 border-blue-200",
  interna: "bg-purple-100 text-purple-800 border-purple-200",
}

interface CitaConCliente extends Cita {
  cliente_nombre?: string
}

export default function GestionAgendaPage() {
  const [semanaActual, setSemanaActual] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [slots, setSlots] = useState<SlotAgenda[]>([])
  const [citas, setCitas] = useState<CitaConCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [citaEditando, setCitaEditando] = useState<CitaConCliente | null>(null)
  const [nuevaCita, setNuevaCita] = useState<Partial<Cita> & { fecha_hora: string }>({
    fecha_hora: "",
    duracion_minutos: 120,
    origen: "interna",
    estado: "en_espera",
  })

  const semanaInicio = startOfWeek(semanaActual, { weekStartsOn: 1 })
  const semanaFin = endOfWeek(semanaActual, { weekStartsOn: 1 })
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i))

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [datosCitas, datosClientes] = await Promise.all([
        getCitas(semanaInicio, semanaFin),
        getClientes(),
      ])
      setSlots(datosCitas.slots as SlotAgenda[])
      setCitas(datosCitas.citas.map((c) => {
        const cliente = datosClientes.find((cl) => cl.id === c.cliente_id)
        return { ...c, cliente_nombre: cliente?.nombre }
      }))
      setClientes(datosClientes)
    } catch (error) {
      console.error("Error cargando agenda:", error)
      toast.error("Error al cargar la agenda")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [semanaActual])

  const semanaAnterior = () => setSemanaActual(subWeeks(semanaActual, 1))
  const semanaSiguiente = () => setSemanaActual(addWeeks(semanaActual, 1))
  const irAHoy = () => setSemanaActual(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const obtenerCitasDelDia = (fecha: Date) => {
    const inicioDia = startOfDay(fecha)
    const finDia = endOfDay(fecha)
    return citas.filter((c) => {
      const fechaCita = parseISO(c.fecha_hora)
      return isWithinInterval(fechaCita, { start: inicioDia, end: finDia })
    })
  }

  const obtenerSlotsDelDia = (fecha: Date) => {
    const inicioDia = startOfDay(fecha)
    const finDia = endOfDay(fecha)
    return slots.filter((s) => {
      const fechaSlot = parseISO(s.fecha_hora)
      return isWithinInterval(fechaSlot, { start: inicioDia, end: finDia })
    })
  }

  const manejarAccionCita = async (id: string, accion: "aceptar" | "cancelar" | "reenviar" | "eliminar", fecha_hora?: string) => {
    try {
      await accionCita(id, accion, fecha_hora)
      toast.success(`Cita ${accion === "eliminar" ? "eliminada" : accion} correctamente`)
      cargarDatos()
    } catch (error) {
      console.error(`Error al ${accion} cita:`, error)
      toast.error(`Error al ${accion} la cita`)
    }
  }

  const manejarGuardarCita = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (citaEditando) {
        await guardarCita({ ...nuevaCita, id: citaEditando.id })
        toast.success("Cita actualizada correctamente")
      } else {
        await guardarCita(nuevaCita)
        toast.success("Cita creada correctamente")
      }
      setDialogAbierto(false)
      setCitaEditando(null)
      setNuevaCita({ fecha_hora: "", duracion_minutos: 120, origen: "interna", estado: "en_espera" })
      cargarDatos()
    } catch (error) {
      console.error("Error guardando cita:", error)
      toast.error("Error al guardar la cita")
    }
  }

  const abrirDialogNuevaCita = (fecha_hora?: string) => {
    setCitaEditando(null)
    setNuevaCita({
      fecha_hora: fecha_hora ?? format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duracion_minutos: 120,
      origen: "interna",
      estado: "en_espera",
    })
    setDialogAbierto(true)
  }

  const abrirDialogEditar = (cita: CitaConCliente) => {
    setCitaEditando(cita)
    setNuevaCita({
      id: cita.id,
      cliente_id: cita.cliente_id ?? undefined,
      nombre_solicitante: cita.nombre_solicitante ?? undefined,
      email: cita.email ?? undefined,
      telefono: cita.telefono ?? undefined,
      descripcion: cita.descripcion ?? undefined,
      fecha_hora: format(parseISO(cita.fecha_hora), "yyyy-MM-dd'T'HH:mm"),
      duracion_minutos: cita.duracion_minutos,
      estado: cita.estado,
      origen: cita.origen,
      meet_link: cita.meet_link ?? undefined,
      notas: cita.notas ?? undefined,
    })
    setDialogAbierto(true)
  }

  const formatearHora = (fecha_hora: string) => format(parseISO(fecha_hora), "HH:mm")
  const formatearFecha = (fecha: Date) => format(fecha, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Agenda Comercial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista semanal de citas y disponibilidad. Gestione citas web e internas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={semanaAnterior} className="press">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={irAHoy} className="press">
            Hoy
          </Button>
          <Button variant="outline" onClick={semanaSiguiente} className="press">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => abrirDialogNuevaCita()} className="press">
            <Plus className="h-4 w-4 mr-2" />
            Nueva cita
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="font-medium text-foreground">
          {format(semanaInicio, "d 'de' MMMM", { locale: es })} - {format(semanaFin, "d 'de' MMMM yyyy", { locale: es })}
        </span>
        {cargando && <span className="text-sm text-muted-foreground">Cargando...</span>}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {diasSemana.map((dia) => (
            <div
              key={dia.toISOString()}
              className={cn(
                "px-2 py-3 text-center text-sm font-medium",
                isSameDay(dia, new Date()) && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {format(dia, "EEE", { locale: es })}
              </div>
              <div className={cn("mt-1 text-lg", isSameDay(dia, new Date()) && "text-primary")}>
                {format(dia, "d", { locale: es })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[600px]">
          {diasSemana.map((dia) => {
            const citasDia = obtenerCitasDelDia(dia)
            const slotsDia = obtenerSlotsDelDia(dia)
            const esHoy = isSameDay(dia, new Date())

            return (
              <div
                key={dia.toISOString()}
                className={cn(
                  "relative border-r border-border p-2 overflow-y-auto",
                  "min-h-[600px]",
                  esHoy && "bg-primary/5",
                  "last:border-r-0"
                )}
              >
                {citasDia.length === 0 && slotsDia.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Sin citas
                  </div>
                )}

                {slotsDia.map((slot) => {
                  const citasSlot = slot.citas.filter((c) => c.estado !== "cancelada")
                  const hayCitaActiva = citasSlot.length > 0
                  const inicioSlot = parseISO(slot.fecha_hora)
                  const finSlot = addMinutes(inicioSlot, slot.duracion_minutos)
                  const yaPasado = isBefore(finSlot, new Date())

                  return (
                    <div
                      key={slot.fecha_hora}
                      className={cn(
                        "mb-2 rounded-lg border p-2 transition-colors cursor-pointer hover:bg-muted/50",
                        hayCitaActiva
                          ? "bg-primary/5 border-primary/20"
                          : yaPasado
                          ? "bg-muted/30 opacity-50"
                          : "bg-green-50 border-green-100 hover:bg-green-100"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {formatearHora(slot.fecha_hora)}
                        </span>
                        {!hayCitaActiva && !yaPasado && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
                            onClick={() => abrirDialogNuevaCita(slot.fecha_hora)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {hayCitaActiva && (
                        <div className="mt-1 space-y-1">
                          {citasSlot.map((citaSlot) => {
                            const citaCompleta = citas.find((c) => c.id === citaSlot.id)
                            if (!citaCompleta) return null
                            return (
                              <div
                                key={citaSlot.id}
                                className={cn(
                                  "rounded bg-white border p-2 text-xs shadow-sm",
                                  COLORES_ESTADO[citaCompleta.estado]
                                )}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {citaCompleta.nombre_solicitante ?? citaCompleta.cliente_nombre ?? "Cliente"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {citaCompleta.descripcion ?? "Sin descripción"}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      {citaCompleta.estado === "en_espera" && (
                                        <DropdownMenuItem
                                          onClick={() => manejarAccionCita(citaCompleta.id, "aceptar")}
                                          className="text-green-600"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-2" />
                                          Aceptar
                                        </DropdownMenuItem>
                                      )}
                                      {citaCompleta.estado !== "cancelada" && (
                                        <DropdownMenuItem
                                          onClick={() => manejarAccionCita(citaCompleta.id, "cancelar")}
                                          className="text-red-600"
                                        >
                                          <XCircle className="h-3 w-3 mr-2" />
                                          Cancelar
                                        </DropdownMenuItem>
                                      )}
                                      {citaCompleta.estado === "aceptada" && (
                                        <DropdownMenuItem
                                          onClick={() => manejarAccionCita(citaCompleta.id, "reenviar")}
                                          className="text-yellow-600"
                                        >
                                          <AlertCircle className="h-3 w-3 mr-2" />
                                          Reenviar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => abrirDialogEditar(citaCompleta)}
                                      >
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => manejarAccionCita(citaCompleta.id, "eliminar")}
                                        className="text-red-600"
                                      >
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span className={cn("px-1.5 py-0.5 rounded text-[9px]", COLORES_ORIGEN[citaCompleta.origen])}>
                                    {citaCompleta.origen === "web" ? "Web" : "Interna"}
                                  </span>
                                  {citaCompleta.meet_link && (
                                    <a href={citaCompleta.meet_link} target="_blank" rel="noopener noreferrer" className="underline">
                                      Meet
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{citaEditando ? "Editar cita" : "Nueva cita interna"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={manejarGuardarCita} className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente (opcional)</Label>
              <Select value={nuevaCita.cliente_id ?? ""} onValueChange={(v) => setNuevaCita({ ...nuevaCita, cliente_id: v || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Sin cliente --</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_solicitante">Nombre solicitante</Label>
              <Input
                id="nombre_solicitante"
                value={nuevaCita.nombre_solicitante ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, nombre_solicitante: e.target.value })}
                placeholder="Nombre del solicitante"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={nuevaCita.email ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={nuevaCita.telefono ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, telefono: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_hora">Fecha y hora</Label>
              <Input
                id="fecha_hora"
                type="datetime-local"
                value={nuevaCita.fecha_hora}
                onChange={(e) => setNuevaCita({ ...nuevaCita, fecha_hora: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
              <Select
                value={String(nuevaCita.duracion_minutos ?? 120)}
                onValueChange={(v) => setNuevaCita({ ...nuevaCita, duracion_minutos: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                  <SelectItem value="180">180 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origen">Origen</Label>
              <Select
                value={nuevaCita.origen ?? "interna"}
                onValueChange={(v) => setNuevaCita({ ...nuevaCita, origen: v as "web" | "interna" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={nuevaCita.estado ?? "en_espera"}
                onValueChange={(v) => setNuevaCita({ ...nuevaCita, estado: v as "en_espera" | "aceptada" | "cancelada" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_espera">En espera</SelectItem>
                  <SelectItem value="aceptada">Aceptada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={nuevaCita.descripcion ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, descripcion: e.target.value })}
                placeholder="Detalles de la cita..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meet_link">Enlace Meet (opcional)</Label>
              <Input
                id="meet_link"
                type="url"
                value={nuevaCita.meet_link ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, meet_link: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas internas</Label>
              <Textarea
                id="notas"
                value={nuevaCita.notas ?? ""}
                onChange={(e) => setNuevaCita({ ...nuevaCita, notas: e.target.value })}
                placeholder="Notas para el equipo..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!nuevaCita.fecha_hora}>
                {citaEditando ? "Guardar cambios" : "Crear cita"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}