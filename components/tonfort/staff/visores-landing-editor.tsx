"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Save } from "lucide-react"
import type { SlotVisorLanding } from "@/lib/supabase/types"

interface Animacion {
  id: string
  titulo: string
  descripcion: string | null
  video_movimiento_url: string
  video_accion_url: string | null
  orden: number
}

interface Visor {
  id: string
  slot: SlotVisorLanding
  eyebrow: string | null
  titulo: string
  descripcion: string | null
  video_global_url: string
  frame_centro_ms: number
  activo: boolean
  orden: number
  animaciones: Animacion[]
}

const VACIO: Omit<Visor, "id" | "animaciones"> = {
  slot: "primero",
  eyebrow: null,
  titulo: "",
  descripcion: null,
  video_global_url: "",
  frame_centro_ms: 0,
  activo: true,
  orden: 0,
}

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-[#2856c7] focus:ring-2 focus:ring-[#2856c7]/20"
const labelClass = "mb-1.5 block text-xs font-sans uppercase tracking-widest text-muted-foreground"

export function VisoresLandingEditor() {
  const [visores, setVisores] = useState<Record<SlotVisorLanding, (Visor | null)>>({
    primero: null,
    segundo: null,
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<SlotVisorLanding | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/staff/diseno/visores-landing", { cache: "no-store" })
      if (!res.ok) throw new Error("No se pudieron cargar los visores")
      const data = (await res.json()) as { visores: Visor[] }
      setVisores({
        primero: data.visores.find((v) => v.slot === "primero") ?? null,
        segundo: data.visores.find((v) => v.slot === "segundo") ?? null,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function patch(slot: SlotVisorLanding, cambios: Partial<Visor>) {
    setVisores((prev) => {
      const base = prev[slot] ?? { ...VACIO, slot, animaciones: [] }
      const { animaciones: _omitir, ...resto } = base
      void _omitir
      return { ...prev, [slot]: { ...resto, ...cambios, animaciones: base.animaciones } }
    })
  }

  // Sube el video global al bucket `visores-video`. La subida va por Route
  // Handler (mismo patrón que `upload-global-video`) porque la sesión de staff
  // es una cookie firmada, no el JWT de Supabase.
  async function subirVideoGlobal(
    slot: SlotVisorLanding,
    file: File,
  ): Promise<string | null> {
    setSubiendo(`${slot}-global`)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/staff/diseno/visores-landing/${slot}/upload-global-video`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No se pudo subir el video")
      }
      const data = (await res.json()) as { url: string }
      return data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir el video")
      return null
    } finally {
      setSubiendo(null)
    }
  }

  async function guardarVisor(slot: SlotVisorLanding) {
    const visor = visores[slot]
    if (!visor) return
    if (!visor.titulo.trim()) {
      toast.error("El título es obligatorio")
      return
    }
    if (!visor.video_global_url) {
      toast.error("Sube el video global antes de guardar")
      return
    }

    setGuardando(slot)
    try {
      const res = await fetch("/api/staff/diseno/visores-landing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot,
          eyebrow: visor.eyebrow,
          titulo: visor.titulo,
          descripcion: visor.descripcion,
          video_global_url: visor.video_global_url,
          frame_centro_ms: visor.frame_centro_ms,
          activo: visor.activo,
          orden: visor.orden,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "No se pudo guardar")
      }
      toast.success(`Visor «${visor.titulo}» guardado`)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setGuardando(null)
    }
  }

  async function agregarAnimacion(slot: SlotVisorLanding) {
    const res = await fetch(`/api/staff/diseno/visores-landing/${slot}/animaciones`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titulo: "Nuevo punto", video_movimiento_url: "PENDIENTE" }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? "No se pudo crear la animación")
      return
    }
    await cargar()
  }

  if (cargando) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando visores…</p>
  }

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Los dos visores son las secciones 3D de la landing. Si un visor está inactivo o sin
        video, la sección no se renderiza. Las animaciones son los puntos que se elige desde
        el visor público.
      </p>

      {(["primero", "segundo"] as const).map((slot) => {
        const visor = visores[slot]
        const base = visor ?? { ...VACIO, slot, animaciones: [] as Animacion[] }

        return (
          <section key={slot} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {slot === "primero" ? "Visor 1" : "Visor 2"}
                <span className="ml-3 font-sans text-sm text-muted-foreground">{slot}</span>
              </h2>
              <button
                type="button"
                onClick={() => guardarVisor(slot)}
                disabled={guardando === slot}
                className="inline-flex items-center gap-2 rounded-full bg-[#2856c7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1c46a8] disabled:opacity-50"
              >
                <Save className="size-4" />
                {guardando === slot ? "Guardando…" : "Guardar"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor={`${slot}-eyebrow`}>
                  Eyebrow
                </label>
                <input
                  id={`${slot}-eyebrow`}
                  className={inputClass}
                  value={base.eyebrow ?? ""}
                  onChange={(e) => patch(slot, { eyebrow: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${slot}-titulo`}>
                  Título
                </label>
                <input
                  id={`${slot}-titulo`}
                  className={inputClass}
                  value={base.titulo}
                  onChange={(e) => patch(slot, { titulo: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor={`${slot}-descripcion`}>
                  Descripción
                </label>
                <textarea
                  id={`${slot}-descripcion`}
                  rows={3}
                  className={inputClass}
                  value={base.descripcion ?? ""}
                  onChange={(e) => patch(slot, { descripcion: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${slot}-frame`}>
                  Frame centro (ms)
                </label>
                <input
                  id={`${slot}-frame`}
                  type="number"
                  min={0}
                  step={100}
                  className={inputClass}
                  value={base.frame_centro_ms}
                  onChange={(e) =>
                    patch(slot, { frame_centro_ms: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={base.activo}
                    onChange={(e) => patch(slot, { activo: e.target.checked })}
                    className="size-4 accent-[#2856c7]"
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="mt-5">
              <span className={labelClass}>Video global</span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className={inputClass}
                  value={base.video_global_url}
                  placeholder="https://…"
                  onChange={(e) => patch(slot, { video_global_url: e.target.value })}
                />
                <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                  {subiendo === `${slot}-global` ? "Subiendo…" : "Subir"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const url = await subirVideoGlobal(slot, file)
                      if (url) patch(slot, { video_global_url: url })
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className={labelClass}>Animaciones ({base.animaciones.length})</span>
                <button
                  type="button"
                  onClick={() => agregarAnimacion(slot)}
                  disabled={!visor}
                  title={visor ? undefined : "Guarda el visor antes de agregar animaciones"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                  Agregar
                </button>
              </div>

              {base.animaciones.length === 0 ? (
                <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin animaciones. El visor se verá como un video lineal.
                </p>
              ) : (
                <ul className="space-y-2">
                  {base.animaciones.map((animacion, i) => (
                    <li
                      key={animacion.id}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                    >
                      <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 truncate text-sm">{animacion.titulo}</span>
                      <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block">
                        {animacion.video_movimiento_url === "PENDIENTE"
                          ? "sin video"
                          : animacion.video_movimiento_url.split("/").pop()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Cada animación es un punto seleccionable dentro del visor público. El orden
                sigue el campo `orden` de cada fila.
              </p>
            </div>
          </section>
        )
      })}
    </div>
  )
}