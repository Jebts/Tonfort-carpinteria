// ARCHIVADO - Versiones de producto (cotización) retiradas del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ versiones: [] }) }
export async function POST(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
