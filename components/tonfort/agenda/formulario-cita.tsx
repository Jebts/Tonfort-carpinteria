"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "motion/react"
import { CalendarCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// espejo local del `citaPublicaSchema` del servidor. El servidor sigue siendo
// la autoridad: esto solo evita un round-trip por error de tecleo.
const formularioSchema = z.object({
  nombre: z.string().min(2, "Escribe tu nombre").max(120),
  telefono: z
    .string()
    .min(7, "WhatsApp no válido")
    .max(40)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "WhatsApp no válido"),
  descripcion: z
    .string()
    .max(1000)
    .refine((v) => v.trim().length === 0 || v.trim().length >= 5, "Cuéntanos un poco más")
    .optional(),
})

export type FormularioCitaValues = z.infer<typeof formularioSchema>

const MAX_DESCRIPCION = 1000

// Máscara `+57 (___) ___-____`. Al teclear solo se aceptan dígitos, y el
// prefijo 57 no se vuelve a duplicar si ya viene pegado.
function maskTelefono(valor: string): string {
  const bruto = valor.replace(/\D/g, "")
  const local = bruto.startsWith("57") ? bruto.slice(2) : bruto
  const digitos = local.slice(0, 10)

  const a = digitos.slice(0, 3)
  const b = digitos.slice(3, 6)
  const c = digitos.slice(6, 10)

  let out = `+57 (${a}`
  if (digitos.length > 3) out += `) ${b}`
  if (digitos.length > 6) out += `-${c}`
  return out
}

export interface FormularioCitaProps {
  /** Nombre de la modalidad, solo para mostrarlo en el resumen del bloque. */
  modalidad: string
  /** Slug público (`virtual` | `presencial`): lo envía el POST. */
  modalidadSlug: string
  seleccionado: { fechaIso: string; bloque: string; resumen: string } | null
  bloqueInicial?: { fecha_hora: string; duracion_minutos: number } | null
}

export function FormularioCita({
  modalidad,
  modalidadSlug,
  seleccionado,
  bloqueInicial,
}: FormularioCitaProps) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const unbloqueado = seleccionado !== null

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormularioCitaValues>({
    resolver: zodResolver(formularioSchema),
    defaultValues: { nombre: "", telefono: "", descripcion: "" },
  })

  const descripcion = watch("descripcion") ?? ""

  // Al pasar de bloqueado a unbloqueado, el foco va al primer campo. No lo
  // forzamos: el overlay animado se encarga de no robar el foco de golpe.
  useEffect(() => {
    if (!unbloqueado) return
    const t = window.setTimeout(() => setFocus("nombre"), 320)
    return () => window.clearTimeout(t)
  }, [unbloqueado, setFocus])

  // Cambiar de bloque no debe arrastrar datos ya escritos.
  useEffect(() => {
    if (!unbloqueado) reset()
  }, [seleccionado?.fechaIso, unbloqueado, reset])

  const duracionMinutos = bloqueInicial?.duracion_minutos ?? 120

  async function onSubmit(values: FormularioCitaValues) {
    if (!seleccionado) return

    setEnviando(true)
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: values.nombre,
          // Se envían solo dígitos: el servidor normaliza igual.
          telefono: values.telefono.replace(/\D/g, ""),
          descripcion: values.descripcion?.trim() || null,
          fecha_hora: seleccionado.fechaIso,
          modalidad: modalidadSlug,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "No se pudo agendar la cita")
      }

      // El resumen viaja por query param para que la página de confirmación
      // lo pueda leer en el servidor, sin depender de estado de cliente.
      const params = new URLSearchParams({
        modalidad: modalidadSlug,
        fecha: seleccionado.fechaIso,
        bloque: seleccionado.bloque,
      })
      router.push(`/agenda/solicitud-recibida?${params.toString()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agendar la cita")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative">
      {/* Resumen del bloque elegido */}
      <AnimatePresence>
        {seleccionado && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 rounded-xl border border-[#2856c7]/30 bg-[#2856c7]/[.04] px-4 py-3"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#0B1D3A]/50">
              {modalidad} · {duracionMinutos} min
            </p>
            <p className="mt-1 text-sm font-medium text-[#0B1D3A]">{seleccionado.resumen}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay: solo cubre los campos, no el mensaje, para que siga legible. */}
      <div className="relative">
        <div
          className={cn(
            "space-y-4 transition-opacity duration-300",
            !unbloqueado && "pointer-events-none opacity-50",
          )}
          aria-hidden={!unbloqueado}
        >
          <div>
            <Label
              htmlFor="nombre"
              className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[#0B1D3A]/70"
            >
              Nombre
            </Label>
            <Input
              id="nombre"
              disabled={!unbloqueado}
              autoComplete="name"
              placeholder="Tu nombre"
              className="h-12 rounded-xl border-border bg-white text-[#0B1D3A] placeholder:text-[#0B1D3A]/50 focus:border-[#2856c7] focus:ring-2 focus:ring-[#2856c7]/20"
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="mt-1.5 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="telefono"
              className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-[#0B1D3A]/80"
            >
              WhatsApp
            </Label>
            <Input
              id="telefono"
              type="tel"
              inputMode="tel"
              disabled={!unbloqueado}
              autoComplete="tel"
              placeholder="+57 (___) ___-____"
              className="h-12 rounded-xl border-border bg-white text-[#0B1D3A] placeholder:text-[#0B1D3A]/50 focus:border-[#2856c7] focus:ring-2 focus:ring-[#2856c7]/20"
              {...register("telefono", {
                onChange: (e) => setValue("telefono", maskTelefono(e.target.value), {
                  shouldValidate: false,
                }),
              })}
            />
            {errors.telefono && (
              <p className="mt-1.5 text-xs text-red-600">{errors.telefono.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label
                htmlFor="descripcion"
                className="text-xs uppercase tracking-[0.18em] text-[#0B1D3A]/80"
              >
                Descripción del proyecto
              </Label>
              <span className="text-xs tabular-nums text-[#0B1D3A]/60">
                {descripcion.length}/{MAX_DESCRIPCION}
              </span>
            </div>
            <Textarea
              id="descripcion"
              disabled={!unbloqueado}
              rows={3}
              maxLength={MAX_DESCRIPCION}
              placeholder="Opcional. Cuéntanos qué quieres hacer."
              className="resize-none rounded-xl border-border bg-white text-[#0B1D3A] placeholder:text-[#0B1D3A]/50 focus:border-[#2856c7] focus:ring-2 focus:ring-[#2856c7]/20"
              {...register("descripcion")}
            />
            {errors.descripcion && (
              <p className="mt-1.5 text-xs text-red-600">{errors.descripcion.message}</p>
            )}
          </div>
        </div>

        <AnimatePresence>
          {!unbloqueado && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 text-center backdrop-blur-[2px]"
            >
              <CalendarCheck className="size-6 text-[#2856c7]" aria-hidden />
              <p className="px-6 text-sm font-medium text-[#0B1D3A]">
                Elige un bloque para continuar.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="submit"
        disabled={!unbloqueado || enviando}
        className={cn(
          "mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 ease-out",
          unbloqueado && !enviando
            ? "bg-[#2856c7] text-white hover:bg-[#1c46a8] active:scale-[.98]"
            : "cursor-not-allowed bg-[#0B1D3A]/25 text-[#0B1D3A]/70",
        )}
      >
        {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Confirmar
      </button>

      <p className="mt-3 text-center text-xs text-[#0B1D3A]/60">
        Te respondemos por WhatsApp. Sin compromiso.
      </p>
    </form>
  )
}
