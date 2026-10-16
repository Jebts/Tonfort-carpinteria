"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { GrillaBloques } from "@/components/tonfort/agenda/grilla-bloques"
import {
  DialogoBloque,
  TarjetaCitaBloque,
} from "@/components/tonfort/agenda/dialogo-bloque"
import { BLOQUES, celdasDeSemana, colorTipoCita, inicioSemana, slotKey } from "@/lib/agenda"
import { formatearFechaLarga, formatearRangoSemana } from "@/lib/agenda-format"
import { accionCita, getCitas, getClientes, guardarCita } from "@/lib/staff-client"
import type { CitaEnSlot, DisponibilidadSlot } from "@/lib/citas-service"
import type { Cita, Cliente, EstadoCita, EstadoSlot, ModalidadCita } from "@/lib/supabase/types"
import { toast } from "sonner"

interface CitaConCliente extends Cita {
  cliente_nombre?: string
}

// Formulario de crear/editar. La fecha y la hora se guardan como las escribe el
// staff sobre la retícula (`yyyy-MM-dd` + `HH:mm` en UTC) y se convierten a ISO
// solo al enviar: la BD guarda todo en UTC.
interface FormCita {
  id?: string
  cliente_id: string
  nombre_solicitante: string
  email: string
  telefono: string
  fecha: string
  hora: string
  duracion_minutos: number
  origen: "web" | "interna"
  estado: EstadoCita
  descripcion: string
  meet_link: string
  notas: string
  direccion: string
  modalidad_id: string
}

function formVacio(fecha: Date, hora?: string): FormCita {
  return {
    cliente_id: "",
    nombre_solicitante: "",
    email: "",
    telefono: "",
    fecha: fecha.toISOString().slice(0, 10),
    // Sin hora explícita (botón global), el primer bloque que quede por delante.
    hora:
      hora ??
      (BLOQUES.find((b) => Number(b.inicio.slice(0, 2)) > fecha.getUTCHours())?.inicio ?? "08:00"),
    duracion_minutos: 120,
    origen: "interna",
    estado: "en_espera",
    descripcion: "",
    meet_link: "",
    notas: "",
    direccion: "",
    modalidad_id: "",
  }
}

// Componentes UTC de una fecha → texto para los inputs.
function fechaInput(iso: string): string {
  return iso.slice(0, 10)
}

function horaInput(iso: string): string {
  return iso.slice(11, 16)
}

// Texto de los inputs → ISO UTC. Devuelve null si el valor no es válido.
function isoUTC(fecha: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null
  const [y, m, d] = fecha.split("-").map(Number)
  const [hh, mm] = hora.split(":").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate() + dias),
  )
}

export default function GestionAgendaPage() {
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()))
  const [slots, setSlots] = useState<DisponibilidadSlot[]>([])
  const [citasCrudas, setCitasCrudas] = useState<Cita[]>([])
  // El catálogo de clientes no depende de la semana: se carga una vez y la
  // grilla solo necesita `{id, nombre}` para sus dos selectores.
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modalidades, setModalidades] = useState<ModalidadCita[]>([])
  const [filtroCliente, setFiltroCliente] = useState("")
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState<FormCita | null>(null)
  // Bloque abierto en la ventana de detalle (clic en una celda de la retícula).
  const [bloqueAbierto, setBloqueAbierto] = useState<{
    fecha: string
    citas: CitaConCliente[]
  } | null>(null)

  // Rango en UTC, igual que el flujo público: lunes 00:00Z → +7 días. Las citas
  // y los slots se generan y guardan en UTC; cualquier aritmética en hora local
  // descolocaba los bloques (era el bug de esta página).
  // Índice id → cliente: resuelve el nombre en O(1) por cita.
  const nombrePorId = useMemo(
    () => new Map(clientes.map((c) => [c.id, c] as const)),
    [clientes],
  )

  useEffect(() => {
    let viva = true
    getClientes()
      .then((data) => {
        if (viva) setClientes(data)
      })
      .catch(() => {
        if (viva) setClientes([])
      })
      return () => {
      viva = false
    }
  }, [])

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const desde = inicioSemana(semana)
      const hasta = sumarDias(desde, 7)
      const datos = await getCitas(desde, hasta, filtroCliente || undefined)
      setSlots(datos.slots ?? [])
      setModalidades(datos.modalidades ?? [])
      setCitasCrudas(datos.citas ?? [])
    } catch (error) {
      console.error("Error cargando agenda:", error)
      toast.error("Error al cargar la agenda")
    } finally {
      setCargando(false)
    }
  }, [semana, filtroCliente])

  // El nombre se resuelve en memo a partir de ambas fuentes: si las citas
  // llegan antes que el catálogo, no quedan tarjetas sin nombre.
  const citas = useMemo<CitaConCliente[]>(
    () =>
      citasCrudas.map((c) => ({
        ...c,
        cliente_nombre: nombrePorId.get(c.cliente_id ?? "")?.nombre,
      })),
    [citasCrudas, nombrePorId],
  )

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  const refrescar = useCallback(() => {
    void cargarDatos()
  }, [cargarDatos])

  // Índice de los slots por `slotKey` (UTC) y celdas de la retícula. Los
  // contadores vienen del servidor (`calcularDisponibilidad`): el flujo público
  // filtra las canceladas de `citas` pero sigue necesitando el dato.
  const datosPorClave = useMemo(() => {
    const mapa = new Map<
      string,
      { estado: EstadoSlot; citas: CitaEnSlot[]; enEspera: number; canceladas: number }
    >()
    for (const s of slots) {
      mapa.set(slotKey(new Date(s.fecha_hora)), {
        estado: s.estado,
        citas: s.citas ?? [],
        enEspera: s.enEspera,
        canceladas: s.canceladas,
      })
    }
    return mapa
  }, [slots])

  const celdas = useMemo(
    () => celdasDeSemana(semana, datosPorClave),
    [semana, datosPorClave],
  )

  const citaPorId = useMemo(() => new Map(citas.map((c) => [c.id, c])), [citas])
  const modalidadPorId = useMemo(
    () => new Map(modalidades.map((m) => [m.id, m])),
    [modalidades],
  )

  // Resumen de cada bloque (contadores, desglose por tipo y ¿hay confirmada?)
  // calculado una sola vez por carga: la celda solo pinta círculos y el `+`.
  const resumenPorClave = useMemo(() => {
    const resumen = new Map<
      string,
      {
        enEspera: number
        canceladas: number
        hayAceptada: boolean
        /** pendientes agrupados por modalidad: el color del círculo lo dice. */
        porTipo: { slug: string | null; cantidad: number }[]
      }
    >()
    for (const [clave, datos] of datosPorClave) {
      const activas = datos.citas.filter((c) => c.estado !== "cancelada")
      const pendientes = datos.citas.filter((c) => c.estado === "en_espera")
      const tipos = new Map<string | null, number>()
      for (const c of pendientes) {
        const slug = c.modalidad_id ? modalidadPorId.get(c.modalidad_id)?.slug ?? null : null
        tipos.set(slug, (tipos.get(slug) ?? 0) + 1)
      }
      resumen.set(clave, {
        // Contadores del servidor (por modalidad cuando la vista la tiene); el
        // recuento local es solo el respaldo si no llegaran.
        enEspera: datos.enEspera ?? pendientes.length,
        canceladas: datos.canceladas ?? datos.citas.length - activas.length,
        hayAceptada: activas.some((c) => c.estado === "aceptada"),
        porTipo: [...tipos.entries()].map(([slug, cantidad]) => ({ slug, cantidad })),
      })
    }
    return resumen
  }, [datosPorClave, modalidadPorId])

  // Citas que no caen en un bloque de la retícula: se listan aparte para no
  // perderlas de vista (no entran en la regla de cupo por bloque).
  const clavesGrilla = useMemo(() => new Set(celdas.map((c) => c.clave)), [celdas])
  const fueraDeBloque = useMemo(
    () => citas.filter((c) => !clavesGrilla.has(slotKey(new Date(c.fecha_hora)))),
    [citas, clavesGrilla],
  )

  // Confirmar no pasa por aquí: va por `confirmarCita` (abre el diálogo y envía
  // la resolución del bloque).
  const manejarAccion = useCallback(
    async (
      cita: CitaConCliente,
      accion: "cancelar" | "mover" | "reenviar" | "eliminar",
      fecha_hora?: string,
    ) => {
      try {
        await accionCita(cita.id, accion, fecha_hora)
        const mensaje: Record<string, string> = {
          cancelar: "Cita cancelada",
          mover: "Cita movida",
          reenviar: "Cita devuelta a en espera",
          eliminar: "Cita eliminada",
        }
        toast.success(mensaje[accion])
        refrescar()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `No se pudo ${accion} la cita`)
      }
    },
    [refrescar],
  )

  // Abre la ventana del bloque con todas sus citas (aceptada/en espera/
  // cancelada). Desde ahí se confirma, se mueve o se edita cada una.
  const abrirBloque = useCallback(
    (fecha: string, citasBloque: CitaConCliente[]) => {
      setBloqueAbierto({ fecha, citas: citasBloque })
    },
    [],
  )

  const confirmarCita = useCallback(
    async (
      cita: CitaConCliente,
      resolucion: { id: string; accion: "mover" | "eliminar"; fecha_hora?: string }[],
    ) => {
      await accionCita(cita.id, "aceptar", undefined, resolucion)
      toast.success("Cita confirmada")
      refrescar()
    },
    [refrescar],
  )

  const abrirFormNueva = (fecha: Date) =>
    setForm(formVacio(fecha, fecha.toISOString().slice(11, 16)))
  const abrirFormGlobal = () => setForm(formVacio(new Date()))

  const abrirFormEditar = (cita: CitaConCliente) => {
    setForm({
      id: cita.id,
      cliente_id: cita.cliente_id ?? "",
      nombre_solicitante: cita.nombre_solicitante ?? "",
      email: cita.email ?? "",
      telefono: cita.telefono ?? "",
      fecha: fechaInput(cita.fecha_hora),
      hora: horaInput(cita.fecha_hora),
      duracion_minutos: cita.duracion_minutos,
      origen: cita.origen,
      estado: cita.estado,
      descripcion: cita.descripcion ?? "",
      meet_link: cita.meet_link ?? "",
      notas: cita.notas ?? "",
      direccion: cita.direccion ?? "",
      modalidad_id: cita.modalidad_id ?? "",
    })
  }

  const guardarForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const fecha_hora = isoUTC(form.fecha, form.hora)
    if (!fecha_hora) {
      toast.error("Revisa la fecha y la hora de la cita")
      return
    }
    const body: Partial<Cita> & { id?: string } = {
      cliente_id: form.cliente_id || null,
      nombre_solicitante: form.nombre_solicitante || null,
      email: form.email || null,
      telefono: form.telefono || null,
      fecha_hora,
      duracion_minutos: form.duracion_minutos,
      origen: form.origen,
      meet_link: form.meet_link || null,
      notas: form.notas || null,
      direccion: form.direccion || null,
      modalidad_id: form.modalidad_id || null,
      descripcion: form.descripcion || null,
    }
    try {
      if (form.id) {
        await guardarCita({ ...body, id: form.id, estado: form.estado })
        toast.success("Cita actualizada")
      } else {
        // Toda `aceptada` pasa por la confirmación del bloque: crear en espera.
        await guardarCita({ ...body, estado: "en_espera" })
        toast.success("Cita creada")
      }
      setForm(null)
      refrescar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la cita")
    }
  }

  const moverSemana = (semanas: number) =>
    setSemana((s) => sumarDias(s, semanas * 7))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Agenda Comercial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista semanal de citas y disponibilidad. Gestione citas web e internas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.nombre}>
                  {cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={abrirFormGlobal} className="press">
            <Plus className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Misma retícula que la agenda pública: 4 bloques × Lun–Sáb. El rango y el
          aviso de carga los pinta la propia `GrillaBloques`. */}
      <GrillaBloques
        titulo={`Semana del ${formatearRangoSemana(semana)}`}
        celdas={celdas}
        onAnterior={() => moverSemana(-1)}
        onSiguiente={() => moverSemana(1)}
        onHoy={() => setSemana(inicioSemana(new Date()))}
        cargando={cargando}
        renderCelda={(celda) => {
          const resumen = resumenPorClave.get(celda.clave)
          const enEspera = resumen?.enEspera ?? 0
          const canceladas = resumen?.canceladas ?? 0
          const hayAceptada = resumen?.hayAceptada ?? false

          // La celda resume el bloque con círculos de contador. El detalle de
          // cada cita se resuelve al pulsar (no por celda en cada render).
          const abrir = () =>
            abrirBloque(
              celda.fecha.toISOString(),
              celda.citas
                .map((slotCita) => citaPorId.get(slotCita.id))
                .filter((c): c is CitaConCliente => Boolean(c)),
            )

          // Un círculo por tipo de cita: su color dice el tipo (azul virtual,
          // verde presencial, morado interna) y el número, cuántas hay en
          // espera. El círculo gris cuenta las canceladas.
          const tipos = resumen?.porTipo ?? []

          return (
            <div
              role="button"
              tabIndex={0}
              data-slot="celda-bloque"
              aria-label={[
                `Bloque ${celda.fecha.toISOString().slice(11, 16)} del ${formatearFechaLarga(celda.fecha)}`,
                ...tipos.map((t) => `${t.cantidad} ${colorTipoCita(t.slug).nombre}`),
                `${enEspera} en espera`,
                `${canceladas} canceladas`,
                ...(hayAceptada ? ["confirmada"] : []),
              ].join(", ")}
              onClick={abrir}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  abrir()
                }
              }}
              className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg py-2 transition hover:bg-accent/40"
            >
              <div className="flex items-center gap-1">
                {tipos.map((t) => {
                  const tipo = colorTipoCita(t.slug)
                  return (
                    <span
                      key={t.slug ?? "interna"}
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ring-2 ring-yellow-400 ${tipo.clase}`}
                      title={`${t.cantidad} ${tipo.nombre}${t.cantidad === 1 ? "" : "es"} en espera`}
                    >
                      {t.cantidad}
                    </span>
                  )
                })}
                {canceladas > 0 && (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground/40 px-1.5 text-[10px] font-bold text-foreground"
                    title={`${canceladas} ${canceladas === 1 ? "cita cancelada" : "citas canceladas"}`}
                  >
                    {canceladas}
                  </span>
                )}
              </div>

              {/* El `+` solo aparece en bloques sin `aceptada`: una confirmada
                  cierra el bloque para todas las modalidades. */}
              {!hayAceptada && !celda.pasado && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-[10px] text-green-400 hover:bg-green-500/10 hover:text-green-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirFormNueva(celda.fecha)
                  }}
                >
                  <Plus className="mr-0.5 h-3 w-3" />
                  Nueva
                </Button>
              )}
            </div>
          )
        }}
      />

      {fueraDeBloque.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Citas fuera de bloque ({fueraDeBloque.length})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            No caen en un bloque de la retícula, así que están fuera de la regla de cupo por
            bloque. Revíselas en{" "}
            <a href="/staff/gestion/citas" className="underline">
              Citas
            </a>
            .
          </p>
          <ul className="mt-3 space-y-2">
            {fueraDeBloque.map((cita) => (
              <li key={cita.id}>
                <TarjetaCitaBloque
                  cita={cita}
                  modalidad={
                    cita.modalidad_id ? modalidadPorId.get(cita.modalidad_id) : undefined
                  }
                  onConfirmar={() =>
                    abrirBloque(
                      cita.fecha_hora,
                      citas.filter(
                        (c) => slotKey(new Date(c.fecha_hora)) === slotKey(new Date(cita.fecha_hora)),
                      ),
                    )
                  }
                  onAccion={(accion) => void manejarAccion(cita, accion)}
                  onEditar={() => abrirFormEditar(cita)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Crear / editar */}
      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar cita" : "Nueva cita interna"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={guardarForm} className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente (opcional)</Label>
                <Select
                  value={form.cliente_id}
                  onValueChange={(v) => setForm({ ...form, cliente_id: v === "sin-cliente" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-cliente">-- Sin cliente --</SelectItem>
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
                  value={form.nombre_solicitante}
                  onChange={(e) => setForm({ ...form, nombre_solicitante: e.target.value })}
                  placeholder="Nombre del solicitante"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+57 300 000 0000"
                  />
                </div>
              </div>

              {/* Fecha y bloque: la cita siempre cae en la retícula, así la regla
                  de cupo por bloque es coherente con lo que se ve en la grilla. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Bloque</Label>
                  <Select
                    value={BLOQUES.some((b) => b.inicio === form.hora) ? form.hora : "personalizada"}
                    onValueChange={(v) => {
                      if (v !== "personalizada") setForm({ ...form, hora: v })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOQUES.map((bloque) => (
                        <SelectItem key={bloque.inicio} value={bloque.inicio}>
                          {bloque.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="personalizada">Otra hora…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!BLOQUES.some((b) => b.inicio === form.hora) && (
                <div className="space-y-2">
                  <Label htmlFor="hora_libre">Hora (UTC)</Label>
                  <Input
                    id="hora_libre"
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm({ ...form, hora: e.target.value || form.hora })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hora fuera de bloque: la cita se verá en “Citas fuera de bloque”.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="duracion_minutos">Duración</Label>
                  <Select
                    value={String(form.duracion_minutos)}
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
                    value={form.origen}
                    onValueChange={(v) =>
                      setForm({ ...form, origen: v as "web" | "interna" })
                    }
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="modalidad_id">Modalidad</Label>
                <Select
                  value={form.modalidad_id || "sin-modalidad"}
                  onValueChange={(v) =>
                    setForm({ ...form, modalidad_id: v === "sin-modalidad" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-modalidad">Sin modalidad</SelectItem>
                    {modalidades.map((modalidad) => (
                      <SelectItem key={modalidad.id} value={modalidad.id}>
                        {modalidad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El cupo es por modalidad: una virtual no bloquea una presencial del mismo bloque.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección de la visita</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Ej. Cra 10 # 20-30"
                />
              </div>

              {form.id && (
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={form.estado}
                    onValueChange={(v) => setForm({ ...form, estado: v as EstadoCita })}
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
              )}

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
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
                  value={form.meet_link}
                  onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas internas</Label>
                <Textarea
                  id="notas"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Notas para el equipo..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!form.fecha || !form.hora}>
                  {form.id ? "Guardar cambios" : "Crear cita"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalle del bloque: lista de citas + confirmación/mover */}
      <DialogoBloque
        abierto={!!bloqueAbierto}
        fecha={bloqueAbierto?.fecha ?? null}
        citas={bloqueAbierto?.citas ?? []}
        modalidades={modalidades}
        onCerrar={() => setBloqueAbierto(null)}
        onAccion={(cita, accion) => void manejarAccion(cita, accion)}
        onMover={(cita, fecha_hora) => void manejarAccion(cita, "mover", fecha_hora)}
        onEditar={(cita) => {
          setBloqueAbierto(null)
          abrirFormEditar(cita)
        }}
        onConfirmar={confirmarCita}
      />

    </div>
  )
}
