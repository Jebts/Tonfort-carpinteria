// ARCHIVADO - API de versiones de cotización retirada del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ versiones: [] }) }
export async function POST(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
