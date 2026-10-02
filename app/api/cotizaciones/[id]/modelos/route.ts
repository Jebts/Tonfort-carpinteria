// ARCHIVADO - API de modelos de cotización retirada del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ modelos: [] }) }
export async function POST(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
