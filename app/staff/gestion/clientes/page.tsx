"use client"

import { useState, useEffect } from "react"
import { Users, Edit2, Trash2, Plus, Search, User, Phone, Mail, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react"
import { FASES, type Cliente, type FaseCliente } from "@/lib/supabase/types"
import { getClientes, guardarCliente, eliminarCliente } from "@/lib/staff-client"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

const ESTADO_COLOR: Record<FaseCliente, "default" | "secondary" | "destructive" | "outline"> = {
  descubrimiento: "secondary",
  evaluacion: "default",
  implementacion: "default",
  egresado: "outline",
}

export default function GestionClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroFase, setFiltroFase] = useState<FaseCliente | "todos">("todos")
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<Partial<Cliente>>({ fase: "descubrimiento" })

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const data = await getClientes()
      setClientes(data)
    } catch (error) {
      console.error("Error cargando clientes:", error)
      toast.error("Error al cargar los clientes")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const clientesFiltrados = clientes.filter((c) => {
    const matchBusqueda =
      !busqueda ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono?.toLowerCase().includes(busqueda.toLowerCase())
    const matchFase = filtroFase === "todos" || c.fase === filtroFase
    return matchBusqueda && matchFase
  })

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (clienteEditando) {
        await guardarCliente({ ...form, id: clienteEditando.id })
        toast.success("Cliente actualizado correctamente")
      } else {
        await guardarCliente(form)
        toast.success("Cliente creado correctamente")
      }
      setDialogAbierto(false)
      setClienteEditando(null)
      setForm({ fase: "descubrimiento" })
      cargarDatos()
    } catch (error) {
      console.error("Error guardando cliente:", error)
      toast.error("Error al guardar el cliente")
    }
  }

  const manejarEliminar = async (cliente: Cliente) => {
    try {
      await eliminarCliente(cliente.id)
      toast.success("Cliente eliminado correctamente")
      cargarDatos()
    } catch (error) {
      console.error("Error eliminando cliente:", error)
      toast.error("Error al eliminar el cliente")
    }
  }

  const abrirDialogNuevo = () => {
    setClienteEditando(null)
    setForm({ fase: "descubrimiento" })
    setDialogAbierto(true)
  }

  const abrirDialogEditar = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setForm({
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email ?? undefined,
      telefono: cliente.telefono ?? undefined,
      fase: cliente.fase,
      info_personal: cliente.info_personal,
      descripcion_proyecto: cliente.descripcion_proyecto ?? undefined,
    })
    setDialogAbierto(true)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestione la base de datos de clientes de la carpintería.
          </p>
        </div>
        <Button onClick={abrirDialogNuevo} className="press">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({clientesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nombre, email, teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={filtroFase}
              onValueChange={(v) => setFiltroFase(v as FaseCliente | "todos")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {FASES.map((fase) => (
                  <SelectItem key={fase.value} value={fase.value}>
                    {fase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Última actualización</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cliente.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_COLOR[cliente.fase] ?? "default"} className={cliente.fase === "implementacion" ? "bg-green-100 text-green-800 border-green-200" : ""}>
                          {FASES.find((f) => f.value === cliente.fase)?.label ?? cliente.fase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cliente.email}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.telefono ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cliente.telefono}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.descripcion_proyecto ? (
                          <div className="flex items-start gap-1 max-w-[200px]">
                            <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <span className="text-sm truncate">
                              {cliente.descripcion_proyecto}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(cliente.actualizado_en), { locale: es, addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirDialogEditar(cliente)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => manejarEliminar(cliente)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{clienteEditando ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={manejarGuardar} className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre ?? ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fase">Fase</Label>
                <Select
                  value={form.fase ?? "descubrimiento"}
                  onValueChange={(v) => setForm({ ...form, fase: v as FaseCliente })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES.map((fase) => (
                      <SelectItem key={fase.value} value={fase.value}>
                        {fase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value || undefined })}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value || undefined })}
                  placeholder="+34 600 000 000"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descripcion_proyecto">Descripción del proyecto</Label>
                <Textarea
                  id="descripcion_proyecto"
                  value={form.descripcion_proyecto ?? ""}
                  onChange={(e) => setForm({ ...form, descripcion_proyecto: e.target.value || undefined })}
                  placeholder="Describe brevemente el proyecto del cliente..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {clienteEditando ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
