"use client"

import { useState } from "react"
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
import { FASES, type Cliente, type FaseCliente } from "@/lib/supabase/types"

export function ClienteForm({
  cliente,
  onCancel,
  onSave,
}: {
  cliente: Cliente
  onCancel: () => void
  onSave: (form: Partial<Cliente>) => void
}) {
  const [nombre, setNombre] = useState(cliente.nombre)
  const [email, setEmail] = useState(cliente.email ?? "")
  const [telefono, setTelefono] = useState(cliente.telefono ?? "")
  const [fase, setFase] = useState<FaseCliente>(cliente.fase)
  const [ciudad, setCiudad] = useState((cliente.info_personal?.ciudad as string) ?? "")
  const [descripcion, setDescripcion] = useState(cliente.descripcion_proyecto ?? "")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          id: cliente.id || undefined,
          nombre,
          email: email || null,
          telefono: telefono || null,
          fase,
          info_personal: { ...cliente.info_personal, ...(ciudad ? { ciudad } : {}) },
          descripcion_proyecto: descripcion || null,
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="c-nombre">Nombre</Label>
        <Input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-tel">Teléfono</Label>
          <Input id="c-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Fase</Label>
        <Select value={fase} onValueChange={(v) => setFase(v as FaseCliente)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FASES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-ciudad">Ciudad / info personal</Label>
        <Input id="c-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-desc">Proyecto</Label>
        <Textarea id="c-desc" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  )
}
