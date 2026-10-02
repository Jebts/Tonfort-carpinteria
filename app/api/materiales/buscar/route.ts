import { NextRequest, NextResponse } from "next/server"

// ARCHIVADO - Búsqueda de materiales.
export async function GET(_req: NextRequest) {
  return NextResponse.json({ material: null })
}
