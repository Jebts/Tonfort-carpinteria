"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays } from "date-fns"
import { motion } from "motion/react"
import { BLOQUES, DIAS_CORTOS, celdasDeSemana, colorTipoCita, inicioSemana, slotKey } from "@/lib/agenda"
import { formatearRangoSemana } from "@/lib/agenda-format"
import { cn } from "@/lib/utils"
import type { EstadoSlot, EstadoCita } from "@/lib/supabase/types"
import { GrillaBloques } from "@/components/tonfort/agenda/grilla-bloques"

export interface BloqueSemana {
  fecha_hora: string
  estado: EstadoSlot
  /** Citas del slot (solo la misma modalidad que la vista). `esMio` marca las
      * del propio visitante (mismo IP) para pintar "tu cita" sin filtrar
      * datos de otros solicitantes. */
  citas?: { id: string; estado: EstadoCita; esMio: boolean }[]
  /** Citas en espera del bloque (contador, sin datos). */
  enEspera?: number
  /** Citas canceladas del bloque (contador, sin datos). */
  canceladas?: number
}

export interface CalendarioProps {
  modalidadId: string
  modalidadSlug: string
  inicial?: BloqueSemana[]
  /** Clave del slot seleccionado en formato `slotKey` (`yyyy-MM-dd HH:mm`).
      * No usar ISO: `agenda-horario.tsx` la convierte antes de pasarla. */
  seleccionado: string | null
  onSelect: (fechaIso: string, bloque: string) => void
}

// La semana y las celdas salen de `lib/agenda` (`inicioSemana`/`celdasDeSemana`):
// todo el flujo se calcula en UTC, que es como se generan los slots y se
// guardan las citas. La retícula es la compartida con la agenda de staff
// (`GrillaBloques`); aquí solo se pinta el contenido público de cada celda.
export function Calendario({
  modalidadId,
  modalidadSlug,
  inicial = [],
  seleccionado,
  onSelect,
}: CalendarioProps) {
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()))
  const [bloques, setBloques] = useState<BloqueSemana[]>(inicial)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    const desde = inicioSemana(semana)
    const hasta = addDays(desde, 7)
    setCargando(true)
    try {
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        modalidad: modalidadSlug || modalidadId,
      })
      const res = await fetch(`/api/citas?${params.toString()}`)
      if (!res.ok) throw new Error("No se pudo cargar la disponibilidad")
      const data = (await res.json()) as { slots: BloqueSemana[] }
      setBloques(data.slots ?? [])
    } catch {
      // Se conserva lo último válido (los slots del servidor). Vaciar la grilla
      // haría ver como libres los bloques que sí están ocupados.
    } finally {
      setCargando(false)
    }
  }, [semana, modalidadId, modalidadSlug])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const estadoPorClave = useMemo(() => {
    const mapa = new Map<
      string,
      { estado: EstadoSlot; mio: boolean; enEspera: number; canceladas: number }
    >()
    for (const b of bloques) {
      mapa.set(slotKey(new Date(b.fecha_hora)), {
        estado: b.estado,
        // El servidor marca `esMio` por cita (mismo IP): es la única señal.
        mio: (b.citas ?? []).some((c) => c.esMio),
        enEspera:
          b.enEspera ?? (b.citas ?? []).filter((c) => c.estado === "en_espera").length,
        canceladas: b.canceladas ?? 0,
      })
    }
    return mapa
  }, [bloques])

  const celdas = useMemo(
    () => celdasDeSemana(semana, estadoPorClave),
    [semana, estadoPorClave],
  )

  const moverSemana = useCallback((semanas: number) => {
    setSemana((s) =>
      new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + semanas * 7)),
    )
  }, [])

  const ahora = new Date()
  const hoyUTC = ahora.getUTCFullYear() * 10000 + ahora.getUTCMonth() * 100 + ahora.getUTCDate()

  return (
    <GrillaBloques
      titulo={`Semana del ${formatearRangoSemana(semana)}`}
      celdas={celdas}
      onAnterior={() => moverSemana(-1)}
      onSiguiente={() => moverSemana(1)}
      cargando={cargando}
      renderCelda={(celda) => {
        const info = estadoPorClave.get(celda.clave)
        const estado = info?.estado
        const esMio = Boolean(info?.mio)
        const enEspera = info?.enEspera ?? 0
        const canceladas = info?.canceladas ?? 0
        const dia = DIAS_CORTOS.find((d) => d.dow === celda.fecha.getUTCDay())

        // El estado se resolvió solo para la modalidad elegida: un bloque
        // con cita `virtual` sigue libre para quien eligió `presencial`.
        // **Solo una cita confirmada (`aceptada`) ocupa el bloque**: mientras
        // la solicitud siga `en_espera` el público puede seguir pidiendo el
        // mismo hueco (es lo mismo que valida `validarSlotLibre`).
        const confirmada = estado === "aceptada"
        const bloqueado = celda.pasado || confirmada
        // `seleccionado` ya viene en formato `slotKey` (ver
        // `agenda-horario.tsx`): comparar directo. No se puede reparsear
        // con `new Date()` porque `slotKey` no es ISO y se leería en hora
        // local, desplazando la clave horas según la zona del visitante.
        const esSeleccionado = seleccionado === celda.clave
        const esHoy =
          celda.fecha.getUTCFullYear() * 10000 +
            celda.fecha.getUTCMonth() * 100 +
            celda.fecha.getUTCDate() ===
          hoyUTC
        const etiqueta = esMio
          ? "Tu cita"
          : confirmada
            ? "Ocupado"
            : esHoy
              ? "Hoy"
              : ""
        // El círculo toma el color del tipo de cita que se está viendo.
        const tipo = colorTipoCita(modalidadSlug)

        return (
          <motion.button
            type="button"
            whileTap={bloqueado ? undefined : { scale: 0.97 }}
            disabled={bloqueado}
            onClick={() => onSelect(celda.fecha.toISOString(), labelBloque(celda.fecha))}
            aria-label={`${dia?.label ?? ""} ${celda.fecha.getUTCDate()}, ${labelBloque(
              celda.fecha,
            )}${esMio ? ", tu cita" : confirmada ? ", ocupado" : bloqueado ? ", no disponible" : ", disponible"}${
              enEspera > 0 ? `, ${enEspera} en espera` : ""
            }${canceladas > 0 ? `, ${canceladas} canceladas` : ""}`}
            aria-pressed={esSeleccionado}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-1 rounded-lg text-xs font-medium transition-all duration-200",
              esSeleccionado
                ? "bg-royal text-white"
                : esMio
                  ? "bg-royal/15 text-royal ring-1 ring-royal/40"
                  : confirmada
                    ? "cursor-not-allowed bg-input text-primary/25"
                    : "bg-card text-primary hover:border hover:border-primary/30",
            )}
          >
            {etiqueta && <span className="text-[10px]">{etiqueta}</span>}
            <span className="flex items-center gap-1">
              {enEspera > 0 && (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-yellow-400 ${tipo.clase}`}
                  title={`${enEspera} ${enEspera === 1 ? "cita en espera" : "citas en espera"} (${tipo.nombre})`}
                >
                  {enEspera}
                </span>
              )}
              {canceladas > 0 && (
                <span
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/30 px-1 text-[9px] font-bold text-foreground"
                  title={`${canceladas} ${canceladas === 1 ? "cita cancelada" : "citas canceladas"}`}
                >
                  {canceladas}
                </span>
              )}
            </span>
          </motion.button>
        )
      }}
    />
  )
}

// Etiqueta del bloque ("08:00 – 10:00") leída de `BLOQUES`, que es la tabla que
// el equipo puede ajustar: calcular el fin como `+2 h` aquí la dejaría desfasada
// en cuanto cambie un bloque.
function labelBloque(fecha: Date): string {
  const inicio = `${fecha.getUTCHours().toString().padStart(2, "0")}:${fecha
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`
  return BLOQUES.find((b) => b.inicio === inicio)?.label ?? inicio
}
