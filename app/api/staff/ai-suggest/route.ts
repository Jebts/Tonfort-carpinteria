import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/staff-auth"
import { aiSuggestSchema } from "@/lib/validators"
import { sugerirTexto } from "@/lib/llm"
import { sanitizeError } from "@/lib/errors"

// POST /api/staff/ai-suggest → genera una sugerencia de texto para un campo.
// Server-only: el LLM (y sus API keys) nunca llega al browser.
export async function POST(req: NextRequest) {
  const denied = requireStaff(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parse = aiSuggestSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parse.error.flatten() },
      { status: 422 },
    )
  }

  const { campo, contexto, promptExtra } = parse.data
  try {
    const sugerencia = await sugerirTexto({ campo, contexto, promptExtra })
    return NextResponse.json({ sugerencia })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Error al generar la sugerencia") },
      { status: 500 },
    )
  }
}
