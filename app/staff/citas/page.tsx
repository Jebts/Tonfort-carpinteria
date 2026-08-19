"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addWeeks, startOfWeek } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AgendaGrid } from "@/components/tonfort/agenda-grid"
import { getCitas, guardarCita } from "@/lib/staff-client"
import type { Cita } from "@/lib/supabase/types"
import type { DisponibilidadSlot } from "@/lib/citas-service"

export default function StaffCitasPage() {
  const [slots, setSlots] = useState<DisponibilidadSlot[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [cargando, setCargando] = useState(true)
  const [referencia, setReferencia] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const inicio = startOfWeek(referencia, { weekStartsOn: 1 })
      const fin = new Date(inicio)
      fin.setDate(fin.getDate() + 6)
      fin.setHours(23, 59, 59, 999)
      const data = await getCitas(inicio, fin)
      setSlots(data.slots as DisponibilidadSlot[])
      setCitas(data.citas)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [referencia])

  useEffect(() => {
    cargar()
  }, [cargar])

  const citaPorId = useMemo(() => {
    const m = new Map<string, Cita>()
    for (const c of citas) m.set(c.id, c)
    return m
  }, [citas])

  const editando = editandoId ? citaPorId.get(editandoId) ?? null : null

  const guardar = async (form: Partial<Cita>) => {
    if (!editando) return
    try {
      const cita = await guardarCita({ id: editando.id, ...form })
      setCitas((p) => p.map((c) => (c.id === cita.id ? cita : c)))
      toast.success("Guardado")
      setEditandoId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Citas confirmadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bloques aceptados con enlace de WhatsApp y Meet. Edita el Meet manualmente.
          </p>
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

      {cargando ? (
        <p className="mt-10 text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-6">
          <AgendaGrid
            slots={slots}
            modo="staff"
            soloAceptadas
            referencia={referencia}
            onEditarCita={(id) => setEditandoId(id)}
          />
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditandoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cita</DialogTitle>
          </DialogHeader>
          {editando && (
            <EditarCitaForm
              cita={editando}
              onCancel={() => setEditandoId(null)}
              onSave={guardar}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditarCitaForm({
  cita,
  onCancel,
  onSave,
}: {
  cita: Cita
  onCancel: () => void
  onSave: (form: Partial<Cita>) => void
}) {
  const [meet, setMeet] = useState(cita.meet_link ?? "")
  const [notas, setNotas] = useState(cita.notas ?? "")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ meet_link: meet || null, notas: notas || null })
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="meet">Enlace de Meet (lo pegas manualmente)</Label>
        <Input
          id="meet"
          placeholder="https://meet.google.com/..."
          value={meet}
          onChange={(e) => setMeet(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
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
