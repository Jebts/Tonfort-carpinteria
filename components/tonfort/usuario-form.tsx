"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { z } from "zod"

const usuarioFormSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional().or(z.literal("")),
  rol: z.enum(["asesor", "disenador"]),
  foto_perfil: z.string().url("URL no válida").nullable().optional(),
  bio_publica: z.string().max(1000).nullable().optional(),
  activo: z.boolean().default(true),
})

type UsuarioFormData = z.infer<typeof usuarioFormSchema>

interface UsuarioFormProps {
  initialData?: Partial<UsuarioFormData> | null
  isEditing: boolean
}

export function UsuarioForm({ initialData, isEditing }: UsuarioFormProps) {
  const router = useRouter()
  const params = useParams()
  const [cargando, setCargando] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof UsuarioFormData, string>>>({})

  const [formData, setFormData] = useState<UsuarioFormData>({
    nombre: initialData?.nombre ?? "",
    email: initialData?.email ?? "",
    password: "",
    rol: initialData?.rol ?? "asesor",
    foto_perfil: initialData?.foto_perfil ?? null,
    bio_publica: initialData?.bio_publica ?? null,
    activo: initialData?.activo ?? true,
  })

  const validateField = (name: keyof UsuarioFormData, value: string | boolean | null) => {
    const fieldSchema = usuarioFormSchema.shape[name]
    if (!fieldSchema) return

    const testData = { ...formData, [name]: value }
    const result = usuarioFormSchema.safeParse(testData)

    if (!result.success) {
      const fieldError = result.error.flatten().fieldErrors[name]
      setErrors((prev) => ({ ...prev, [name]: fieldError?.[0] }))
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }))
      validateField(name as keyof UsuarioFormData, checked)
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
      validateField(name as keyof UsuarioFormData, value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)

    const result = usuarioFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: Partial<Record<keyof UsuarioFormData, string>> = {}
      for (const [key, val] of Object.entries(fieldErrors)) {
        newErrors[key as keyof UsuarioFormData] = val?.[0]
      }
      setErrors(newErrors)
      setCargando(false)
      return
    }

    try {
      const method = isEditing ? "PUT" : "POST"
      const url = isEditing ? `/api/staff/usuarios/${params.id}` : "/api/staff/usuarios"

      const body = isEditing
        ? {
            ...formData,
            password: formData.password || undefined,
            foto_perfil: formData.foto_perfil || null,
            bio_publica: formData.bio_publica || null,
          }
        : formData

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error && typeof data.error === "object") {
          setErrors(data.error as Partial<Record<keyof UsuarioFormData, string>>)
        } else {
          throw new Error(data.error ?? "Error al guardar")
        }
        setCargando(false)
        return
      }

      toast.success(isEditing ? "Usuario actualizado" : "Usuario creado")
      router.push("/staff/administracion/usuarios")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input
          id="nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          className={errors.nombre ? "border-destructive" : ""}
        />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isEditing}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        {isEditing && <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          Contraseña {isEditing ? "(dejar vacío para no cambiar)" : ""}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete={isEditing ? "new-password" : "current-password"}
          className={errors.password ? "border-destructive" : ""}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rol">Rol</Label>
        <Select
          value={formData.rol}
          onValueChange={(value) => {
            setFormData((prev) => ({ ...prev, rol: value as "asesor" | "disenador" }))
            validateField("rol", value)
          }}
          disabled={isEditing}
        >
          <SelectTrigger id="rol" className={errors.rol ? "border-destructive" : ""}>
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asesor">Asesor</SelectItem>
            <SelectItem value="disenador">Diseñador</SelectItem>
          </SelectContent>
        </Select>
        {errors.rol && <p className="text-sm text-destructive">{errors.rol}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="foto_perfil">Foto de perfil (URL)</Label>
        <Input
          id="foto_perfil"
          name="foto_perfil"
          type="url"
          value={formData.foto_perfil ?? ""}
          onChange={handleChange}
          className={errors.foto_perfil ? "border-destructive" : ""}
        />
        {errors.foto_perfil && <p className="text-sm text-destructive">{errors.foto_perfil}</p>}
        <p className="text-xs text-muted-foreground">
          {formData.rol === "disenador" && formData.activo
            ? "Obligatorio para diseñadores activos"
            : "Opcional"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio_publica">Bio pública</Label>
        <textarea
          id="bio_publica"
          name="bio_publica"
          value={formData.bio_publica ?? ""}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.bio_publica && <p className="text-sm text-destructive">{errors.bio_publica}</p>}
        <p className="text-xs text-muted-foreground">
          {formData.rol === "disenador" && formData.activo
            ? "Obligatorio para diseñadores activos (máx. 1000 caracteres)"
            : "Opcional (máx. 1000 caracteres)"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="activo"
          name="activo"
          checked={formData.activo}
          onCheckedChange={(checked) => {
            setFormData((prev) => ({ ...prev, activo: checked as boolean }))
            validateField("activo", checked as boolean)
          }}
        />
        <Label htmlFor="activo" className="cursor-pointer">
          Cuenta activa
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={cargando}>
          {cargando ? "Guardando…" : isEditing ? "Actualizar" : "Crear"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}