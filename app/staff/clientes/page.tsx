"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "motion/react"
import { Pencil, Plus, Search, Trash2, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { FASES, type Cliente, type FaseCliente } from "@/lib/supabase/types"
import {
  eliminarCliente,
  getClientes,
  guardarCliente,
} from "@/lib/staff-client"
import { ClienteForm } from "@/components/tonfort/staff/cliente-form"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function StaffClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [creando, setCreando] = useState(false)
  const [q, setQ] = useState("")
  const [faseSel, setFaseSel] = useState<FaseCliente | null>(null)
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      setClientes(await getClientes())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return clientes.filter((c) => {
      const coincideFase = !faseSel || c.fase === faseSel
      const coincideQ =
        term === "" ||
        [c.nombre, c.email, c.telefono, c.descripcion_proyecto]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(term))
      return coincideFase && coincideQ
    })
  }, [clientes, q, faseSel])

  const porFase = useMemo(() => {
    const map: Record<FaseCliente, Cliente[]> = {
      descubrimiento: [],
      evaluacion: [],
      implementacion: [],
      egresado: [],
    }
    for (const c of filtrados) map[c.fase].push(c)
    return map
  }, [filtrados])

  const fasesAMostrar = faseSel ? FASES.filter((f) => f.value === faseSel) : FASES

  const abrirCrear = () => {
    setEditando({
      id: "",
      nombre: "",
      email: null,
      telefono: null,
      fase: "descubrimiento",
      info_personal: {},
      descripcion_proyecto: null,
      creado_en: "",
      actualizado_en: "",
    })
    setCreando(true)
  }

  const guardar = async (form: Partial<Cliente>) => {
    try {
      const cliente = await guardarCliente(form)
      setClientes((prev) =>
        creando ? [cliente, ...prev] : prev.map((c) => (c.id === cliente.id ? cliente : c)),
      )
      toast.success(creando ? "Cliente creado" : "Cambios guardados")
      setEditando(null)
      setCreando(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    }
  }

  const borrar = async (id: string) => {
    const cliente = clientes.find((c) => c.id === id)
    if (!cliente) return
    setClienteAEliminar(cliente)
  }
  const confirmarBorrar = async () => {
    if (!clienteAEliminar) return
    try {
      await eliminarCliente(clienteAEliminar.id)
      setClientes((prev) => prev.filter((c) => c.id !== clienteAEliminar.id))
      toast.success("Eliminado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar")
    } finally {
      setClienteAEliminar(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clientes agrupados por fase del embudo familiar.
          </p>
        </div>
        <Button onClick={abrirCrear} className="press">
          <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o proyecto…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFaseSel(null)}
            className={cn(
              "press rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors",
              faseSel === null
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            Todas
          </button>
          {FASES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFaseSel(f.value)}
              className={cn(
                "press rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors",
                faseSel === f.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="mt-10 text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {fasesAMostrar.map((f) => (
            <section key={f.value} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {f.label} · {porFase[f.value].length}
              </h2>
              <div className="mt-4 space-y-3">
                {porFase[f.value].length === 0 && (
                  <p className="text-sm text-muted-foreground/70">Sin clientes en esta fase.</p>
                )}
                {porFase[f.value].map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-5%" }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="card-hover rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {[c.email, c.telefono].filter(Boolean).join(" · ") || "Sin contacto"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="press" asChild>
                            <Link href={`/staff/agenda?cliente=${encodeURIComponent(c.nombre)}`}>
                              <CalendarDays className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="press" onClick={() => { setEditando(c); setCreando(false) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="press" onClick={() => borrar(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {c.descripcion_proyecto && (
                        <p className="mt-2 text-sm text-muted-foreground">{c.descripcion_proyecto}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creando ? "Nuevo cliente" : "Editar cliente"}</DialogTitle>
          </DialogHeader>
          {editando && (
            <ClienteForm
              cliente={editando}
              onCancel={() => setEditando(null)}
              onSave={guardar}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!clienteAEliminar}
        title="¿Eliminar cliente?"
        description={`Vas a eliminar a "${clienteAEliminar?.nombre}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarBorrar}
        onOpenChange={(o) => !o && setClienteAEliminar(null)}
      />
    </div>
  )
}
