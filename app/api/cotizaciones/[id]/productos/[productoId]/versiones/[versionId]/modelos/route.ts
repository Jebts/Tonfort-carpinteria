// ARCHIVADO - Modelos de versión de producto de cotización retirados del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ modelos: [] }) }
export async function PUT(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
