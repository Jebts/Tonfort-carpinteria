// ARCHIVADO - API de materiales por ID retirada del flujo activo.
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest) {
  return NextResponse.json({ materiales: [] })
}
export async function GET_ID(_req: NextRequest) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
export async function POST() {
  return Response.json({ error: "Not found" }, { status: 404 })
}
export async function PUT() {
  return Response.json({ error: "Not found" }, { status: 404 })
}
export async function DELETE() {
  return Response.json({ error: "Not found" }, { status: 404 })
}
