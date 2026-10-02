"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UsuarioForm } from "@/components/tonfort/usuario-form"
import { Plus, Edit, Trash2, Eye, AlertCircle } from "lucide-react"
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

export function UsuariosListClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUsuarios = async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/staff/usuarios", { credentials: "include" })
      if (!res.ok) throw new Error("Error al cargar usuarios")
      const data = await res.json()
      setUsuarios(data.usuarios ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar usuarios")
    } finally {
      setCargando(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`¿Desactivar usuario ${email}?`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/staff/usuarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al desactivar")
      }
      toast.success("Usuario desactivado")
      fetchUsuarios()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desactivar")
    } finally {
      setDeletingId(null)
    }
  }

  const rolLabels: Record<string, string> = {
    admin: "Administrador",
    asesor: "Asesor",
    disenador: "Diseñador",
  }

  const rolColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    asesor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    disenador: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-foreground">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas del equipo interno.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando usuarios…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas del equipo interno.
          </p>
        </div>
        <Button onClick={() => { setEditingUsuario(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Creado</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{usuario.nombre}</p>
                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", rolColors[usuario.rol])}>
                    {rolLabels[usuario.rol]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", usuario.activo ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")}>
                    {usuario.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(usuario.creado_en).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingUsuario(usuario); setShowForm(true); }}
                      disabled={deletingId === usuario.id}
                      aria-label="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(usuario.id, usuario.email)}
                      disabled={deletingId === usuario.id || !usuario.activo || usuario.rol === "admin"}
                      aria-label="Desactivar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    {!usuario.activo && (
                      <AlertCircle className="h-4 w-4 text-amber-500" aria-label="Usuario inactivo" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-foreground">
                {editingUsuario ? "Editar usuario" : "Nuevo usuario"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingUsuario(null); }}>
                <span className="sr-only">Cerrar</span>
                ✕
              </Button>
            </div>
            <UsuarioForm
              initialData={editingUsuario ? {
                nombre: editingUsuario.nombre,
                email: editingUsuario.email,
                password: "",
                rol: editingUsuario.rol === "admin" ? "asesor" : editingUsuario.rol,
                foto_perfil: editingUsuario.foto_perfil,
                bio_publica: editingUsuario.bio_publica,
                activo: editingUsuario.activo,
              } : null}
              isEditing={!!editingUsuario}
            />
          </div>
        </div>
      )}
    </div>
  )
}