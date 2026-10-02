import { getSesionServer } from "@/lib/staff-auth"
import { redirect } from "next/navigation"
import { CotizacionDetalle } from "./cotizacion-detalle"

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ cotizacionId: string }>
}) {
  const sesion = await getSesionServer()
  if (!sesion) redirect("/staff/login")
  if (sesion.rol !== "admin") redirect("/staff")

  const { cotizacionId } = await params
  return <CotizacionDetalle cotizacionId={cotizacionId} />
}
