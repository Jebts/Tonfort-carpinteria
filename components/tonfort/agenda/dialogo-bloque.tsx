"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BLOQUES, slotKey, slotEnPasado } from "@/lib/agenda"
import { formatearFechaLarga } from "@/lib/agenda-format"
import { useBloquesLibres } from "@/hooks/use-bloques-libres"
import type { Cita, EstadoCita, ModalidadCita } from "@/lib/supabase/types"

export interface CitaBloque extends Cita {
  cliente_nombre?: string
}

type Destino = { accion: "mover"; fecha_hora: string } | { accion: "eliminar" }

type Vista =
  | { tipo: "detalle" }
  | { tipo: "confirmar"; cita: CitaBloque }
  | { tipo: "mover"; cita: CitaBloque }

export const COLORES_ESTADO: Record<EstadoCita, string> = {
  en_espera: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
  aceptada: "border-green-500/40 bg-green-500/10 text-green-200",
  cancelada: "border-red-500/40 bg-red-500/10 text-red-200",
}

export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  en_espera: "En espera",
  aceptada: "Confirmada",
  cancelada: "Cancelada",
}

const COLORES_ORIGEN: Record<string, string> = {
  web: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  interna: "border-purple-500/40 bg-purple-500/10 text-purple-200",
}

export interface DialogoBloqueProps {
  abierto: boolean
  /** ISO UTC del bloque (o de la cita fuera de bloque) que se está viendo. */
  fecha: string | null
  /** Todas las citas de ese bloque, aceptadas/en espera/canceladas. */
  citas: CitaBloque[]
  modalidades: ModalidadCita[]
  onCerrar: () => void
  onAccion: (
    cita: CitaBloque,
    accion: "cancelar" | "reenviar" | "eliminar",
  ) => void
  /** Mover: el destino llega como ISO UTC. */
  onMover: (cita: CitaBloque, fecha_hora: string) => void
  onEditar: (cita: CitaBloque) => void
  /** Abre el formulario de nueva cita (prefill del bloque actual si procede). */
  onNuevaCita?: () => void
  /** Confirmar resolviendo el resto del bloque. Debe lanzar si falla. */
  onConfirmar: (
    cita: CitaBloque,
    resolucion: { id: string; accion: "mover" | "eliminar"; fecha_hora?: string }[],
  ) => Promise<void>
}

// Ventana del bloque: lista en detalle de cada cita y, desde ahí, la dinámica de
// confirmación — al confirmar una, todas las demás `en_espera` del bloque tienen
// que moverse o eliminarse, **eligiendo el destino de cada una por separado**.
export function DialogoBloque({
  abierto,
  fecha,
  citas,
  modalidades,
  onCerrar,
  onAccion,
  onMover,
  onEditar,
  onNuevaCita,
  onConfirmar,
}: DialogoBloqueProps) {
  const [vista, setVista] = useState<Vista>({ tipo: "detalle" })
  const [destinos, setDestinos] = useState<Record<string, Destino | undefined>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const citaActiva = vista.tipo === "detalle" ? null : vista.cita
  const enVistaAccion = vista.tipo !== "detalle"

  // Se pide una sola vez por apertura del diálogo (no en cada cambio de vista).
  const { libres, cargando: cargandoLibres } = useBloquesLibres(
    citaActiva?.modalidad_id ?? null,
    abierto,
  )

  // El bloque que se está confirmando nunca es destino válido: mover una
  // pendiente ahí dejaría el bloque con confirmada + en_espera. `mover` usa la
  // lista completa; `confirmar` usa esta ya filtrada.
  const destinoExcluido = citaActiva ? slotKey(new Date(citaActiva.fecha_hora)) : null
  const bloquesDestino = useMemo(
    () => libres.filter((iso) => slotKey(new Date(iso)) !== destinoExcluido),
    [libres, destinoExcluido],
  )

  // Un bloque pasado no debe permitir crear citas nuevas.
  const bloquePasado = fecha ? slotEnPasado(new Date(fecha)) : false

  // El backend solo obliga a resolver las `en_espera` del mismo `fecha_hora` **y**
  // `modalidad_id` (`resolverConfirmacion`): si aquí se piden todas las del bloque,
  // un bloque mixto envía una resolución que el servidor rechaza con 422 y la
  // confirmación se vuelve imposible. `null` cuenta como modalidad propia.
  const pendientes = useMemo(
    () =>
      citaActiva
        ? citas.filter(
            (c) =>
              c.estado === "en_espera" &&
              c.id !== citaActiva.id &&
              (c.modalidad_id ?? null) === (citaActiva.modalidad_id ?? null),
          )
        : [],
    [citas, citaActiva],
  )

  // Cada vez que se abre (o se abre otro bloque) se empieza por el detalle.
  useEffect(() => {
    if (abierto) {
      setVista({ tipo: "detalle" })
      setDestinos({})
      setError(null)
    }
  }, [abierto, fecha])

  const completa = pendientes.every((p) => destinos[p.id] !== undefined)

  const confirmar = async () => {
    if (!citaActiva || !completa) return
    setEnviando(true)
    setError(null)
    try {
      const resolucion = pendientes.map((p) => {
        const d = destinos[p.id]
        return d && d.accion === "mover"
          ? { id: p.id, accion: "mover" as const, fecha_hora: d.fecha_hora }
          : { id: p.id, accion: "eliminar" as const }
      })
      await onConfirmar(citaActiva, resolucion)
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la cita")
    } finally {
      setEnviando(false)
    }
  }

  const etiquetaBloque = (iso: string): string => {
    const inicio = iso.slice(11, 16)
    const bloque = BLOQUES.find((b) => b.inicio === inicio)
    return bloque ? bloque.label : inicio
  }

  const ordenadas = [...citas].sort((a, b) => {
    const peso = (c: EstadoCita) => (c === "en_espera" ? 0 : c === "aceptada" ? 1 : 2)
    return peso(a.estado) - peso(b.estado)
  })

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="max-w-lg">
        {vista.tipo === "detalle" && (
          <>
            <DialogHeader className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <DialogTitle>Detalle del bloque</DialogTitle>
                <DialogDescription>
                  {fecha
                    ? `${formatearFechaLarga(new Date(fecha))} · ${etiquetaBloque(fecha)} · ${citas.length} ${
                        citas.length === 1 ? "cita" : "citas"
                      }`
                    : ""}
                </DialogDescription>
              </div>
              <Button
                type="button"
                onClick={onNuevaCita}
                disabled={!onNuevaCita || bloquePasado}
                className="press"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva cita
              </Button>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {ordenadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bloque libre.</p>
              ) : (
                ordenadas.map((cita) => {
                  const modalidad = cita.modalidad_id
                    ? modalidades.find((m) => m.id === cita.modalidad_id)
                    : undefined
                  return (
                    <TarjetaCitaBloque
                      key={cita.id}
                      cita={cita}
                      modalidad={modalidad}
                      onConfirmar={() => setVista({ tipo: "confirmar", cita })}
                      onMover={() => setVista({ tipo: "mover", cita })}
                      onAccion={(accion) => onAccion(cita, accion)}
                      onEditar={() => onEditar(cita)}
                    />
                  )
                })
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCerrar}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}

        {vista.tipo === "confirmar" && citaActiva && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar cita</DialogTitle>
              <DialogDescription>
                {citaActiva.nombre_solicitante ?? citaActiva.cliente_nombre ?? "La cita"}{" "}
                queda confirmada en el bloque del{" "}
                {formatearFechaLarga(new Date(citaActiva.fecha_hora))}. El bloque solo admite
                una cita confirmada, así que hay que resolver antes el resto de solicitudes
                del mismo bloque.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {pendientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay otras solicitudes en espera en este bloque. Puedes confirmar.
                </p>
              ) : (
                pendientes.map((p) => {
                  const destino = destinos[p.id]
                  return (
                    <div key={p.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.nombre_solicitante ?? p.cliente_nombre ?? "Solicitante sin nombre"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.telefono ?? "sin teléfono"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={destino?.accion === "mover" ? "default" : "outline"}
                            onClick={() =>
                              setDestinos((d) => ({
                                ...d,
                                [p.id]: { accion: "mover", fecha_hora: bloquesDestino[0] ?? "" },
                              }))
                            }
                            disabled={bloquesDestino.length === 0 && !cargandoLibres}
                          >
                            <CalendarClock className="mr-1 h-3 w-3" />
                            Mover a…
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={destino?.accion === "eliminar" ? "destructive" : "outline"}
                            onClick={() =>
                              setDestinos((d) => ({ ...d, [p.id]: { accion: "eliminar" } }))
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Eliminar
                          </Button>
                        </div>
                      </div>

                      {destino?.accion === "mover" && (
                        <div className="space-y-1.5">
                          <Label htmlFor={`destino-${p.id}`}>Mover al bloque</Label>
                          <Select
                            value={destino.fecha_hora}
                            onValueChange={(v) =>
                              setDestinos((d) => ({
                                ...d,
                                [p.id]: { accion: "mover", fecha_hora: v },
                              }))
                            }
                          >
                            <SelectTrigger id={`destino-${p.id}`}>
                              <SelectValue placeholder="Elige un bloque libre" />
                            </SelectTrigger>
                            <SelectContent>
                              {bloquesDestino.map((iso) => (
                                <SelectItem key={iso} value={iso}>
                                  {formatearFechaLarga(new Date(iso))} · {etiquetaBloque(iso)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {cargandoLibres && (
                            <p className="text-xs text-muted-foreground">
                              Buscando bloques libres…
                            </p>
                          )}
                        </div>
                      )}

                      {destino?.accion === "eliminar" && (
                        <p className="flex items-start gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          Se elimina la solicitud: se contacta al cliente y se cancela el pedido.
                        </p>
                      )}
                    </div>
                  )
                })
              )}

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVista({ tipo: "detalle" })}>
                Volver
              </Button>
              <Button
                type="button"
                onClick={() => void confirmar()}
                disabled={!completa || enviando}
              >
                {enviando ? "Confirmando…" : "Confirmar cita"}
              </Button>
            </DialogFooter>
          </>
        )}

        {vista.tipo === "mover" && citaActiva && (
          <>
            <DialogHeader>
              <DialogTitle>Mover cita</DialogTitle>
              <DialogDescription>
                {citaActiva.nombre_solicitante ?? "La cita"} — elige un bloque libre de las
                próximas 6 semanas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {bloquesDestino.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {cargandoLibres ? "Buscando bloques libres…" : "No hay bloques libres en el rango."}
                </p>
              ) : (
                bloquesDestino.map((iso) => (
                  <Button
                    key={iso}
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => onMover(citaActiva, iso)}
                  >
                    <CalendarClock className="mr-2 h-3.5 w-3.5" />
                    {formatearFechaLarga(new Date(iso))} · {etiquetaBloque(iso)}
                  </Button>
                ))
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVista({ tipo: "detalle" })}>
                Volver
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Tarjeta de una cita del bloque (la usa la ventana del bloque y la lista de
// citas fuera de bloque de la agenda de staff).
export function TarjetaCitaBloque({
  cita,
  modalidad,
  onConfirmar,
  onMover,
  onAccion,
  onEditar,
}: {
  cita: CitaBloque
  modalidad: ModalidadCita | undefined
  onConfirmar?: () => void
  onMover?: () => void
  onAccion?: (accion: "cancelar" | "reenviar" | "eliminar") => void
  onEditar?: () => void
}) {
  const presencial = modalidad?.slug === "presencial"
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {cita.nombre_solicitante ?? cita.cliente_nombre ?? "Cliente"}
          </p>
          {cita.telefono && (
            <p className="truncate text-xs text-muted-foreground">{cita.telefono}</p>
          )}
        </div>
        {(onAccion || onEditar || onConfirmar || onMover) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Acciones de ${cita.nombre_solicitante ?? cita.cliente_nombre ?? "la cita"}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {cita.estado === "en_espera" && onConfirmar && (
                <DropdownMenuItem onClick={onConfirmar} className="text-green-400">
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  Confirmar
                </DropdownMenuItem>
              )}
              {cita.estado !== "cancelada" && onMover && (
                <DropdownMenuItem onClick={onMover}>
                  <CalendarClock className="mr-2 h-3.5 w-3.5" />
                  Mover
                </DropdownMenuItem>
              )}
              {cita.estado !== "cancelada" && onAccion && (
                <DropdownMenuItem onClick={() => onAccion("cancelar")} className="text-red-400">
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                  Cancelar
                </DropdownMenuItem>
              )}
              {cita.estado === "aceptada" && onAccion && (
                <DropdownMenuItem onClick={() => onAccion("reenviar")} className="text-yellow-400">
                  <AlertCircle className="mr-2 h-3.5 w-3.5" />
                  Reenviar
                </DropdownMenuItem>
              )}
              {onEditar && (
                <DropdownMenuItem onClick={onEditar}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar
                </DropdownMenuItem>
              )}
              {(cita.estado === "en_espera" || cita.estado === "cancelada") && onAccion && (
                <DropdownMenuItem onClick={() => onAccion("eliminar")} className="text-red-400">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className={COLORES_ESTADO[cita.estado]}>
          {ETIQUETA_ESTADO[cita.estado]}
        </Badge>
        <Badge variant="outline" className={COLORES_ORIGEN[cita.origen] ?? ""}>
          {cita.origen === "web" ? "Web" : "Interna"}
        </Badge>
        {modalidad && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            {modalidad.nombre}
          </Badge>
        )}
        {cita.movida && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            Movida
          </Badge>
        )}
        {cita.meet_link && (
          <a
            href={cita.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-xs underline"
          >
            Meet
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {cita.descripcion && (
        <p className="mt-1 text-xs text-muted-foreground">{cita.descripcion}</p>
      )}

      {presencial && (cita.direccion || cita.precio_copiado > 0) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {cita.direccion}
          {cita.precio_copiado > 0 && (
            <span className="ml-1 tabular-nums">
              ·{" "}
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(cita.precio_copiado)}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
