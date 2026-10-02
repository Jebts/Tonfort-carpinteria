"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UsuarioForm } from "@/components/tonfort/usuario-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Usuario {
  id: string
  email: string
  password_hash: string
  nombre: string
  rol: "admin" | "asesor" | "disenador"
  foto_perfil: string | null
  bio_publica: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string
}

type UsuarioFormData = Omit<Usuario, "id" | "password_hash" | "creado_en" | "actualizado_en"> & {
  password?: string
  rol: "asesor" | "disenador"
}

interface UsuarioEditClientProps {
  usuarioId: string
}

export function UsuarioEditClient({ usuarioId }: UsuarioEditClientProps) {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const fetchUsuario = async () => {
      setCargando(true)
      try {
        const res = await fetch(`/api/staff/usuarios/${usuarioId}`, { credentials: "include" })
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Usuario no encontrado")
            router.push("/staff/administracion/usuarios")
            return
          }
          throw new Error("Error al cargar usuario")
        }
        const data = await res.json()
        setUsuario(data.usuario)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar usuario")
        router.push("/staff/administracion/usuarios")
      } finally {
        setCargando(false)
      }
    }
    fetchUsuario()
  }, [usuarioId, router])

  if (cargando) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/staff/administracion/usuarios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <h1 className="font-display text-3xl text-foreground">Editar usuario</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!usuario) return null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/staff/administracion/usuarios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="font-display text-3xl text-foreground">Editar usuario</h1>
        <p className="mt-1 text-sm text-muted-foreground">{usuario.email}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <UsuarioForm
          initialData={{
            nombre: usuario.nombre,
            email: usuario.email,
            password: "",
            rol: usuario.rol === "admin" ? "asesor" : usuario.rol,
            foto_perfil: usuario.foto_perfil,
            bio_publica: usuario.bio_publica,
            activo: usuario.activo,
          }}
          isEditing={true}
        />
      </div>
    </div>
  )
}