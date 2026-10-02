import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { CotizacionCliente } from "./cotizacion-cliente"
import type { CotizacionConDetalles } from "@/lib/supabase/types"

interface CotizacionResponse {
  cotizacion?: CotizacionConDetalles
  error?: string
}

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const headerStore = await headers()
  const protocol = headerStore.get("x-forwarded-proto") ?? "https"
  const host = headerStore.get("host")

  if (!host) {
    notFound()
  }

  const response = await fetch(`${protocol}://${host}/api/cotizaciones/link/${encodeURIComponent(token)}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    notFound()
  }

  const data = (await response.json()) as CotizacionResponse
  if (!data.cotizacion) {
    notFound()
  }

  return <CotizacionCliente cotizacion={data.cotizacion} token={token} />
}
