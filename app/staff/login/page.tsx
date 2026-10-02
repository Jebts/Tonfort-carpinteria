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
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Credenciales incorrectas")
      }
      toast.success("Bienvenido")

      const rol = data?.sesion?.rol
      const defaultRedirect =
        rol === "disenador"
          ? "/staff/diseno"
          : rol === "asesor"
            ? "/staff/gestion"
            : "/staff/administracion"

      let redirect = params.get("redirect") || defaultRedirect
      if (!redirect.startsWith("/") || redirect.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(redirect)) {
        redirect = defaultRedirect
      }
      router.push(redirect)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al entrar")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="usuario">Usuario o email</Label>
          <Input
            id="usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="admin o admin@tonfort.local"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Cuentas de acceso rápido:</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setUsuario("admin")
              setPassword("TonfortAdmin2026!")
            }}
            className="rounded border border-border bg-background p-1.5 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="font-medium text-foreground">Admin</div>
            <div className="text-[10px] text-muted-foreground">admin</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setUsuario("disenador")
              setPassword("disenador12345")
            }}
            className="rounded border border-border bg-background p-1.5 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="font-medium text-foreground">Diseñador</div>
            <div className="text-[10px] text-muted-foreground">disenador</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setUsuario("asesor")
              setPassword("asesor12345")
            }}
            className="rounded border border-border bg-background p-1.5 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="font-medium text-foreground">Asesor</div>
            <div className="text-[10px] text-muted-foreground">asesor</div>
          </button>
        </div>
      </div>
    </div>
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
          Panel interno de tonfort. Si eres cliente, reserva tu turno en la{" "}
          <Link href="/agenda" className="underline underline-offset-4">
            agenda pública
          </Link>
          .
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
