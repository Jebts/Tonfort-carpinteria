// ARCHIVADO - Items de cotización retirados del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ items: [] }) }
export async function POST(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
