"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, CheckCircle, XCircle, AlertCircle, MoreHorizontal, Plus, Search, Clock, Filter, Trash2, Edit2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, isWithinInterval } from "date-fns"
import { es } from "date-fns/locale"
import { getCitas, accionCita, guardarCita, getClientes } from "@/lib/staff-client"
import type { Cita, Cliente } from "@/lib/supabase/types"
import { ESTADOS_CITA, type EstadoCita } from "@/lib/supabase/types"
import { toast } from "sonner"

interface CitaConCliente extends Cita {
  cliente_nombre?: string
}

const ESTADO_COLOR: Record<EstadoCita, "default" | "secondary" | "destructive" | "outline"> = {
  en_espera: "outline",
  aceptada: "default",
  cancelada: "destructive",
}

const ORIGEN_COLOR: Record<string, string> = {
  web: "bg-blue-100 text-blue-800",
  interna: "bg-purple-100 text-purple-800",
}

export default function GestionCitasPage() {
  const [fechaInicio, setFechaInicio] = useState<Date>(startOfDay(new Date()))
  const [fechaFin, setFechaFin] = useState<Date>(endOfDay(addDays(new Date(), 30)))
  const [citas, setCitas] = useState<CitaConCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [filtroOrigen, setFiltroOrigen] = useState<string>("todos")
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [citaEditando, setCitaEditando] = useState<CitaConCliente | null>(null)
  const [form, setForm] = useState<Partial<Cita> & { fecha_hora: string }>({
    fecha_hora: "",
    duracion_minutos: 120,
    origen: "interna",
    estado: "en_espera",
  })

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [datosCitas, datosClientes] = await Promise.all([
        getCitas(fechaInicio, fechaFin),
        getClientes(),
      ])
      const citasConCliente = datosCitas.citas.map((c) => {
        const cliente = datosClientes.find((cl) => cl.id === c.cliente_id)
        return { ...c, cliente_nombre: cliente?.nombre }
      })
      setCitas(citasConCliente)
      setClientes(datosClientes)
    } catch (error) {
      console.error("Error cargando citas:", error)
      toast.error("Error al cargar las citas")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [fechaInicio, fechaFin])

  const citasFiltradas = citas.filter((c) => {
    const matchBusqueda =
      !busqueda ||
      c.nombre_solicitante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono?.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado
    const matchOrigen = filtroOrigen === "todos" || c.origen === filtroOrigen
    return matchBusqueda && matchEstado && matchOrigen
  })

  const manejarAccion = async (cita: CitaConCliente, accion: "aceptar" | "cancelar" | "reenviar" | "eliminar") => {
    try {
      await accionCita(cita.id, accion)
      toast.success(`Cita ${accion === "eliminar" ? "eliminada" : accion} correctamente`)
      cargarDatos()
    } catch (error) {
      console.error(`Error al ${accion}:`, error)
      toast.error(`Error al ${accion} la cita`)
    }
  }

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (citaEditando) {
        await guardarCita({ ...form, id: citaEditando.id })
        toast.success("Cita actualizada correctamente")
      } else {
        await guardarCita(form)
        toast.success("Cita creada correctamente")
      }
      setDialogAbierto(false)
      setCitaEditando(null)
      setForm({ fecha_hora: "", duracion_minutos: 120, origen: "interna", estado: "en_espera" })
      cargarDatos()
    } catch (error) {
      console.error("Error guardando cita:", error)
      toast.error("Error al guardar la cita")
    }
  }

  const abrirDialogNuevo = () => {
    setCitaEditando(null)
    const ahora = new Date()
    setForm({
      fecha_hora: format(ahora, "yyyy-MM-dd'T'HH:mm"),
      duracion_minutos: 120,
      origen: "interna",
      estado: "en_espera",
    })
    setDialogAbierto(true)
  }

  const abrirDialogEditar = (cita: CitaConCliente) => {
    setCitaEditando(cita)
    setForm({
      id: cita.id,
      cliente_id: cita.cliente_id ?? undefined,
      nombre_solicitante: cita.nombre_solicitante ?? undefined,
      email: cita.email ?? undefined,
      telefono: cita.telefono ?? undefined,
      direccion: cita.direccion ?? undefined,
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

  const rangoAnterior = () => {
    const diff = differenceInDays(fechaFin, fechaInicio)
    setFechaFin(subDays(fechaFin, diff + 1))
    setFechaInicio(subDays(fechaInicio, diff + 1))
  }

  const rangoSiguiente = () => {
    const diff = differenceInDays(fechaFin, fechaInicio)
    setFechaInicio(addDays(fechaInicio, diff + 1))
    setFechaFin(addDays(fechaFin, diff + 1))
  }

  const irAHoy = () => {
    setFechaInicio(startOfDay(new Date()))
    setFechaFin(endOfDay(addDays(new Date(), 30)))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Citas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de citas web e internas. Acepte, cancele o mueva citas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={rangoAnterior} className="press">
            Anterior
          </Button>
          <Button variant="outline" onClick={irAHoy} className="press">
            Hoy
          </Button>
          <Button variant="outline" onClick={rangoSiguiente} className="press">
            Siguiente
          </Button>
          <Button onClick={abrirDialogNuevo} className="press">
            <Plus className="h-4 w-4 mr-2" />
            Nueva cita
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período: {format(fechaInicio, "d MMM", { locale: es })} - {format(fechaFin, "d MMM yyyy", { locale: es })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="en_espera">En espera</SelectItem>
                <SelectItem value="aceptada">Aceptadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los orígenes</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="interna">Interna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Cargando citas...
                    </td>
                  </tr>
                ) : citasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No hay citas en este período.
                    </td>
                  </tr>
                ) : (
                  citasFiltradas.map((cita) => (
                    <TableRow key={cita.id}>
                      <TableCell>
                        <Badge variant={ESTADO_COLOR[cita.estado] ?? "default"} className={cita.estado === "aceptada" ? "bg-green-100 text-green-800 border-green-200" : ""}>
                          {ESTADOS_CITA.find((e) => e.value === cita.estado)?.label ?? cita.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ORIGEN_COLOR[cita.origen]}>
                          {cita.origen === "web" ? "Web" : "Interna"}
                        </Badge>
                      </TableCell>
                      <TableCell>{cita.nombre_solicitante ?? cita.cliente_nombre ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarCheck className="h-3 w-3 text-muted-foreground" />
                          {format(parseISO(cita.fecha_hora), "PPP", { locale: es })}
                          <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                          {format(parseISO(cita.fecha_hora), "p", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cita.duracion_minutos} min
                        {cita.movida && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            Movida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{cita.cliente_nombre ?? "—"}</TableCell>
                      <TableCell>{cita.direccion ?? "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {cita.estado === "en_espera" && (
                              <DropdownMenuItem
                                onClick={() => manejarAccion(cita, "aceptar")}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aceptar
                              </DropdownMenuItem>
                            )}
                            {cita.estado !== "cancelada" && (
                              <DropdownMenuItem
                                onClick={() => manejarAccion(cita, "cancelar")}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            {cita.estado === "aceptada" && (
                              <DropdownMenuItem
                                onClick={() => manejarAccion(cita, "reenviar")}
                                className="text-yellow-600"
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Reenviar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => abrirDialogEditar(cita)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => manejarAccion(cita, "eliminar")}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{citaEditando ? "Editar cita" : "Nueva cita"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={manejarGuardar} className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente (opcional)</Label>
              <Select
                value={form.cliente_id ?? ""}
                onValueChange={(v) => setForm({ ...form, cliente_id: v || undefined })}
              >
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
                value={form.nombre_solicitante ?? ""}
                onChange={(e) => setForm({ ...form, nombre_solicitante: e.target.value })}
                placeholder="Nombre del solicitante"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono ?? ""}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección de la visita</Label>
              <Input
                id="direccion"
                value={form.direccion ?? ""}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Ej. Cra 10 # 20-30, Bogotá"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_hora">Fecha y hora</Label>
              <Input
                id="fecha_hora"
                type="datetime-local"
                value={form.fecha_hora}
                onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
              <Select
                value={String(form.duracion_minutos ?? 120)}
                onValueChange={(v) => setForm({ ...form, duracion_minutos: Number(v) })}
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
                value={form.origen ?? "interna"}
                onValueChange={(v) => setForm({ ...form, origen: v as "web" | "interna" })}
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
                value={form.estado ?? "en_espera"}
                onValueChange={(v) => setForm({ ...form, estado: v as "en_espera" | "aceptada" | "cancelada" })}
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
                value={form.descripcion ?? ""}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalles de la cita..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meet_link">Enlace Meet (opcional)</Label>
              <Input
                id="meet_link"
                type="url"
                value={form.meet_link ?? ""}
                onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas internas</Label>
              <Textarea
                id="notas"
                value={form.notas ?? ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas para el equipo..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!form.fecha_hora}>
                {citaEditando ? "Guardar cambios" : "Crear cita"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const _msPerDay = 86400000
  return Math.round((dateLeft.getTime() - dateRight.getTime()) / _msPerDay)
}