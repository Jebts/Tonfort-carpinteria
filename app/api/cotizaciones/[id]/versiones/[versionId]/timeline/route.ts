// ARCHIVADO - Timeline de cotización retirado del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ timeline: [] }) }
export async function PUT(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
