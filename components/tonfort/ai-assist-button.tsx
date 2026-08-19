"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Botón reutilizable de asistencia por IA para los campos de formulario.
// Vive solo en el formulario de Proyectos hoy, pero está pensado para extenderse
// a clientes/citas. Llama a /api/staff/ai-suggest (server-only) y rellena el
// campo con la sugerencia. Las API keys del LLM nunca llegan al browser.
export function AIAssistButton({
  campo,
  getContexto,
  onSugerencia,
  className,
}: {
  /** Etiqueta/clave del campo que se va a redactar. */
  campo: string
  /** Devuelve los demás campos del formulario como contexto base. */
  getContexto: () => Record<string, string>
  /** Callback con el texto sugerido para rellenar el campo. */
  onSugerencia: (texto: string) => void
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [promptExtra, setPromptExtra] = useState("")
  const [cargando, setCargando] = useState(false)

  const generar = async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/staff/ai-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campo, contexto: getContexto(), promptExtra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      onSugerencia(data.sugerencia as string)
      toast.success("Sugerencia lista")
      setAbierto(false)
      setPromptExtra("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la sugerencia")
    } finally {
      setCargando(false)
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Sugerir ${campo} con IA`}
          title="Sugerir con IA"
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-medium">Asistente de redacción</p>
          <p className="text-xs text-muted-foreground">
            Genera una propuesta para <span className="font-medium">“{campo}”</span> con el
            contexto del formulario.
          </p>
        </div>
        <Textarea
          rows={3}
          value={promptExtra}
          onChange={(e) => setPromptExtra(e.target.value)}
          placeholder="Instrucción opcional (p. ej. 'más breve', 'tono cálido')"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={generar} disabled={cargando}>
            {cargando ? <Spinner className="text-primary-foreground" /> : <Sparkles className="h-4 w-4" />}
            Generar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
