"use client"

import { useEffect, useState } from "react"
import { getBloquesLibresProximos } from "@/lib/staff-client"

// Bloques libres de las próximas semanas, para ofrecer destinos al mover o al
// confirmar una `en_espera`. `activo` evita la consulta mientras el diálogo
// está cerrado.
export function useBloquesLibres(
  modalidadId: string | null | undefined,
  activo: boolean,
  semanas = 6,
): { libres: string[]; cargando: boolean } {
  const [libres, setLibres] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!activo) return
    let viva = true
    setCargando(true)
    getBloquesLibresProximos(modalidadId ?? null, semanas)
      .then((slots) => {
        if (!viva) return
        setLibres(
          slots
            .map((s) => s.fecha_hora)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
        )
      })
      .catch(() => {
        if (viva) setLibres([])
      })
      .finally(() => {
        if (viva) setCargando(false)
      })
    return () => {
      viva = false
    }
  }, [activo, modalidadId, semanas])

  return { libres, cargando }
}
