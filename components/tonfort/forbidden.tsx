"use client"

import { motion } from "motion/react"
import { Home, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function Forbidden() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-4rem)] w-full items-center justify-center px-4"
    >
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h1 className="mt-6 font-display text-4xl font-bold text-foreground">
          403 — Acceso denegado
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          No tienes permiso para acceder a esta sección.
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Contacta al administrador si crees que esto es un error.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/staff"
            className={cn(
              "press inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            )}
          >
            <Home className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>
      </div>
    </motion.div>
  )
}