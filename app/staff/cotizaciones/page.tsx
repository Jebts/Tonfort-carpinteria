"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CotizacionesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.back()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Volviendo...</p>
    </div>
  )
}