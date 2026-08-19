"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [cargando, setCargando] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Credenciales incorrectas")
      }
      toast.success("Bienvenido")
      let redirect = params.get("redirect") || "/staff/clientes"
      if (!redirect.startsWith("/") || redirect.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(redirect)) {
        redirect = "/staff/clientes"
      }
      router.push(redirect)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al entrar")
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  )
}

export default function StaffLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="font-display text-2xl text-foreground">Acceso del equipo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Panel interno de tonfort. Si eres cliente, reserva tu turno en el{" "}
          <a href="/agenda" className="underline underline-offset-4">
            agenda pública
          </a>
          .
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
