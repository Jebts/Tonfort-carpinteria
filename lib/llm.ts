// lib/llm.ts
// Resolvedor de LLM configurable (mock | groq | openai) para la carpintería.
// Adaptado al contexto de portafolio
// (proyectos de carpintería). El cliente web llama al LLM en el Route Handler
// (/api/staff/ai-suggest, server-only) para que las API keys nunca lleguen al
// browser. Las variables se leen SIN prefijo (LLM_PROVIDER, GROQ_*, OPENAI_*),
// igual que en el SaaS.

export interface LLMConfig {
  use_mock: boolean
  base_url?: string
  api_key?: string
  model?: string
}

export function resolverLLM(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'groq').toString().toLowerCase()

  if (provider === 'mock') {
    return { use_mock: true }
  }

  if (provider === 'openai') {
    return {
      use_mock: false,
      base_url: 'https://api.openai.com/v1/chat/completions',
      api_key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    }
  }

  // default: groq
  return {
    use_mock: false,
    base_url: 'https://api.groq.com/openai/v1/chat/completions',
    api_key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  }
}

export interface SugerirTextoArgs {
  campo: string
  contexto: Record<string, string>
  promptExtra?: string
}

// Texto determinista para modo mock (sin API key externa). Se usa en tests y
// entornos sin costo: deja claro que es una sugerencia de IA mock basada en el
// campo y el contexto recibidos.
function mockSugerir({ campo, contexto, promptExtra }: SugerirTextoArgs): string {
  const ctxLineas = Object.entries(contexto)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
  const ctx = ctxLineas.length
    ? `\nContexto del proyecto:\n${ctxLineas.join('\n')}`
    : ''
  const extra = promptExtra && promptExtra.trim() ? `\nInstrucción del staff: ${promptExtra.trim()}` : ''
  return `【IA mock】Sugerencia para "${campo}": escribe aquí un texto de portafolio${ctx}${extra}.`
}

// Arma el system prompt con el tono de un portafolio de carpintería artesanal.
function systemPrompt(): string {
  return [
    'Eres un redactor de portafolio para un taller de carpintería artesanal (muebles a medida: cocinas, closets, muebles de TV, puertas).',
    'Escribes en español, con tono cálido y profesional, destacando la artesanía, los materiales y el detalle de iluminación que caracterizan al taller.',
    'Entregas solo el texto solicitado para el campo indicado, sin preámbulos ni explicaciones.',
  ].join(' ')
}

// Genera una sugerencia de texto para un campo del formulario de proyecto,
// usando los demás campos como contexto base + un prompt opcional del staff.
export async function sugerirTexto(args: SugerirTextoArgs): Promise<string> {
  const cfg = resolverLLM()

  if (cfg.use_mock) {
    return mockSugerir(args)
  }

  const contextoLineas = Object.entries(args.contexto)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
    .join('\n')
  const promptExtra = args.promptExtra && args.promptExtra.trim()
    ? `\nInstrucción adicional del staff: ${args.promptExtra.trim()}`
    : ''
  const userPrompt = `Campo a redactar: "${args.campo}".${contextoLineas ? `\n\nDatos del proyecto:\n${contextoLineas}` : ''}${promptExtra}\n\nRedacta el contenido para "${args.campo}".`

  try {
    const res = await fetch(cfg.base_url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.api_key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`LLM error ${res.status}: ${txt}`)
    }

    const data = await res.json()
    return (data?.choices?.[0]?.message?.content as string) ?? ''
  } catch (err) {
    console.error("[llm] error al generar sugerencia:", err)
    return mockSugerir(args)
  }
}
