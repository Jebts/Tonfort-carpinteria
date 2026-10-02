// ARCHIVADO - API de cotizaciones retirada del flujo activo.
import { NextRequest, NextResponse } from "next/server"
export async function GET(_req: NextRequest) { return NextResponse.json({ proyectos: [] }) }
export async function POST(_req: NextRequest) { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
