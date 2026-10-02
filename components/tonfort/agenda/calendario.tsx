"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BLOQUES, DIAS_LABORALES, slotKey } from "@/lib/agenda"
import { cn } from "@/lib/utils"
import type { EstadoSlot } from "@/lib/supabase/types"

const DIAS_CORTOS = [
  { dow: 1, label: "Lun" },
  { dow: 2, label: "Mar" },
  { dow: 3, label: "Mié" },
  { dow: 4, label: "Jue" },
  { dow: 5, label: "Vie" },
  { dow: 6, label: "Sáb" },
]

export interface BloqueSemana {
  fecha_hora: string
  estado: EstadoSlot
}

export interface CalendarioProps {
  modalidadId: string
  modalidadSlug: string
  inicial?: BloqueSemana[]
  seleccionado: string | null
  onSelect: (fechaIso: string, bloque: string) => void
}

// Lunes de la semana actual. Todo se calcula en UTC, que es como `lib/agenda`
// genera los slots y como se guardan las citas.
function inicioSemana(base: Date): Date {
  const d = startOfWeek(base, { weekStartsOn: 1 })
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

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
      // La grilla queda vacía: mejor que mostrar disponibilidad inventada.
      setBloques([])
    } finally {
      setCargando(false)
    }
  }, [semana, modalidadId, modalidadSlug])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const estadoPorClave = useMemo(() => {
    const mapa = new Map<string, EstadoSlot>()
    for (const b of bloques) {
      mapa.set(slotKey(new Date(b.fecha_hora)), b.estado)
    }
    return mapa
  }, [bloques])

  const encabezado = useMemo(() => {
    const fin = addDays(semana, 6)
    const mismoMes = semana.getUTCMonth() === fin.getUTCMonth()
    const izq = `${semana.getUTCDate()} de ${format(semana, "MMMM", { locale: es })}`
    const der = mismoMes
      ? `${fin.getUTCDate()} de ${format(fin, "MMMM", { locale: es })}`
      : `${fin.getUTCDate()} de ${format(fin, "MMMM", { locale: es })}`
    return `Semana del ${izq} al ${der}`
  }, [semana])

  const ahora = new Date()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSemana(addWeeks(semana, -1))}
          aria-label="Semana anterior"
          className="rounded-full border border-border p-2 text-[#0B1D3A] transition hover:bg-white active:scale-95"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-[#0B1D3A]" aria-live="polite">
          {encabezado}
        </p>
        <button
          type="button"
          onClick={() => setSemana(addWeeks(semana, 1))}
          aria-label="Semana siguiente"
          className="rounded-full border border-border p-2 text-[#0B1D3A] transition hover:bg-white active:scale-95"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {cargando && (
        <p className="mb-3 text-xs text-[#0B1D3A]/50" aria-live="polite">
          Consultando disponibilidad…
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {/* Encabezados de día */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `4rem repeat(${DIAS_CORTOS.length}, minmax(0, 1fr))` }}
        >
          <div aria-hidden />
          {DIAS_CORTOS.map((dia) => {
            const fecha = new Date(
              Date.UTC(semana.getUTCFullYear(), semana.getUTCMonth(), semana.getUTCDate() + (dia.dow - 1)),
            )
            return (
              <div key={dia.dow} className="px-2 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#0B1D3A]/50">
                  {dia.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#0B1D3A]">
                  {fecha.getUTCDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Filas por bloque horario */}
        {BLOQUES.map((bloque) => (
          <div
            key={bloque.inicio}
            className="grid border-b border-border last:border-b-0"
            style={{ gridTemplateColumns: `4rem repeat(${DIAS_CORTOS.length}, minmax(0, 1fr))` }}
          >
            <div className="flex items-center justify-center border-r border-border px-1 text-[10px] text-[#0B1D3A]/50">
              {bloque.inicio}
            </div>

            {DIAS_CORTOS.map((dia) => {
              const fecha = new Date(
                Date.UTC(
                  semana.getUTCFullYear(),
                  semana.getUTCMonth(),
                  semana.getUTCDate() + (dia.dow - 1),
                  Number(bloque.inicio.slice(0, 2)),
                  Number(bloque.inicio.slice(3, 5)),
                ),
              )
              const clave = slotKey(fecha)
              const estado = estadoPorClave.get(clave)
              const pasado = fecha.getTime() < ahora.getTime()

              // El estado se resolvió solo para la modalidad elegida: un bloque
              // con cita `virtual` sigue libre para quien eligió `presencial`.
              const ocupado = estado === "aceptada" || estado === "en_espera"
              const bloqueado = pasado || ocupado
              const esSeleccionado = seleccionado === clave
              const laborable = DIAS_LABORALES.includes(fecha.getUTCDay())

              if (!laborable) {
                return <div key={dia.dow} className="min-h-14 bg-[#F7F4EE]/60" />
              }

              return (
                <div key={dia.dow} className="border-r border-border p-1 last:border-r-0">
                  <motion.button
                    type="button"
                    whileTap={bloqueado ? undefined : { scale: 0.97 }}
                    disabled={bloqueado}
                    onClick={() => onSelect(fecha.toISOString(), `${bloque.inicio} – ${bloque.fin}`)}
                    aria-label={`${dia.label} ${fecha.getUTCDate()}, ${bloque.label}${
                      bloqueado ? ", no disponible" : ", disponible"
                    }`}
                    aria-pressed={esSeleccionado}
                    className={cn(
                      "flex h-12 w-full items-center justify-center rounded-lg text-xs font-medium transition-all duration-200",
                      esSeleccionado
                        ? "bg-[#2856c7] text-white"
                        : bloqueado
                          ? "cursor-not-allowed bg-[#F7F4EE] text-[#0B1D3A]/25"
                          : "bg-white text-[#0B1D3A] hover:border hover:border-[#0B1D3A]/30",
                      pasado && !esSeleccionado && "bg-[#F7F4EE] text-[#0B1D3A]/15",
                    )}
                  >
                    {isSameDay(fecha, ahora) ? "Hoy" : ""}
                  </motion.button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
