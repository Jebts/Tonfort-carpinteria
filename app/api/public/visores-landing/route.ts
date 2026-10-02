import { NextResponse } from "next/server"
import { getVisoresLandingActivos } from "@/lib/portfolio-service"

export const revalidate = 300

// GET /api/public/visores-landing
// Visores activos de la landing con sus animaciones. Sin datos de staff.
export async function GET() {
  const visores = await getVisoresLandingActivos()

  return NextResponse.json({ visores })
}