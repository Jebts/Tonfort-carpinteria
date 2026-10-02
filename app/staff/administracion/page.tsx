"use client"

import { motion } from "motion/react"
import { Users, CalendarDays, FileText, TrendingUp, AlertTriangle, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

const stats = [
  { label: "Cotizaciones", value: "—", icon: AlertTriangle, href: "/staff/administracion/cotizaciones" },
  { label: "Usuarios", value: "—", icon: UserCog, href: "/staff/administracion/usuarios" },
  { label: "Portafolio", value: "—", icon: TrendingUp, href: "/staff/administracion/portafolio" },
]

export default function AdministracionDashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-foreground">Dashboard de Administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista general del estado de la carpintería.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Link href={stat.href}>
              <div className={cn(
                "rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors",
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground">Accesos rápidos</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" asChild className="press">
            <Link href="/staff/diseno">Módulo de diseño</Link>
          </Button>
          <Button variant="outline" asChild className="press">
            <Link href="/staff/gestion/agenda">Agenda y citas</Link>
          </Button>
          <Button variant="outline" asChild className="press">
            <Link href="/staff/gestion/clientes">Clientes</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}