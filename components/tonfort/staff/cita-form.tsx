"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Cita, Cliente } from "@/lib/supabase/types"
import { getClientes, guardarCliente } from "@/lib/staff-client"
import { toLocalInput } from "@/lib/utils"

export function CitaForm({
  onCancel,
  onSave,
  fechaHora,
}: {
  onCancel: () => void
  onSave: (form: Partial<Cita>) => void
  fechaHora?: Date
}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("nuevo")
  const [clienteId, setClienteId] = useState<string | null>(null)

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [infoPersonal, setInfoPersonal] = useState("")

  const [fecha, setFecha] = useState(() => (fechaHora ? toLocalInput(fechaHora) : toLocalInput(new Date(Date.now() + 3600_000))))
  const [descripcion, setDescripcion] = useState("")
  const [estado, setEstado] = useState<Cita["estado"]>("en_espera")
  const [origen, setOrigen] = useState<Cita["origen"]>("interna")
  const [meetLink, setMeetLink] = useState("")
  const [notas, setNotas] = useState("")

  useEffect(() => {
    let activo = true
    getClientes()
      .then((cs) => activo && setClientes(cs))
      .catch(() => activo && setClientes([]))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (modoCliente === "existente" && clienteId) {
      const cliente = clientes.find((c) => c.id === clienteId)
      if (cliente) {
        setNombre(cliente.nombre)
        setEmail(cliente.email ?? "")
        setTelefono(cliente.telefono ?? "")
        setInfoPersonal((cliente.info_personal?.ciudad as string) ?? "")
      }
    }
  }, [modoCliente, clienteId, clientes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let clienteIdFinal = clienteId

    if (modoCliente === "nuevo") {
      try {
        const nuevo = await guardarCliente({
          nombre,
          email: email || null,
          telefono: telefono || null,
          info_personal: infoPersonal ? { ciudad: infoPersonal } : {},
          descripcion_proyecto: null,
          fase: "descubrimiento",
        })
        clienteIdFinal = nuevo.id
      } catch (err) {
        toast.error("No se pudo crear el cliente")
        return
      }
    }

    onSave({
      cliente_id: clienteIdFinal ?? undefined,
      nombre_solicitante: nombre,
      email: email || null,
      telefono: telefono || null,
      fecha_hora: new Date(fecha).toISOString(),
      descripcion: descripcion || null,
      origen,
      estado,
      meet_link: meetLink || null,
      notas: notas || null,
      duracion_minutos: 120,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border p-4 space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Información del cliente</h3>

        <div className="space-y-1.5">
          <Label>Fuente del cliente</Label>
          <Select value={modoCliente} onValueChange={(v) => { setModoCliente(v as "existente" | "nuevo"); setClienteId(null) }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nuevo">Nuevo cliente</SelectItem>
              <SelectItem value="existente">Cliente existente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {modoCliente === "existente" && (
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId ?? ""} onValueChange={(v) => setClienteId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="infoPersonal">Info personal (ciudad, etc.)</Label>
          <Input id="infoPersonal" value={infoPersonal} onChange={(e) => setInfoPersonal(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Información de la cita</h3>

        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha y hora</Label>
          <Input id="fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as Cita["estado"])}>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="meetLink">Meet link</Label>
            <Input id="meetLink" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  )
}
