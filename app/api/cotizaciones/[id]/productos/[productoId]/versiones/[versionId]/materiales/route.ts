// ARCHIVADO - Materiales de versión de producto (cotización) retirados del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ materiales: [] }) }
export async function PUT(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
