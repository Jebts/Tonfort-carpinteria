import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

type AccessValue =
  | {
      ok: true
      session: { usuario: string; nombre: string; rol: "admin" | "disenador" }
      supabase: SupabaseClient
    }
  | { ok: false; response: NextResponse }

const access = vi.hoisted((): { value: AccessValue } => ({
  value: {
    ok: true as const,
    session: { usuario: "disenador@test.com", nombre: "Diseñador Test", rol: "disenador" as const },
    supabase: null as unknown as SupabaseClient,
  },
}))

vi.mock("@/lib/diseno-access", () => ({
  getDisenoProjectAccess: () => Promise.resolve(access.value),
}))

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO: "Backend no configurado",
}))

import { makeSupabase } from "@/tests/helpers/supabase"
import { POST } from "@/app/api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/duplicar/route"

const projectId = "project-1"
const productoId = "product-1"
const propuestaId = "propuesta-1"

const propuestaOriginal = {
  id: propuestaId,
  producto_id: productoId,
  titulo: "Original",
  descripcion: "Descripción de prueba",
  orden: 1,
  estado: "borrador" as const,
  link_token: null,
  link_activo: false,
  publicada_portafolio: false,
  video_global_url: "https://example.com/video.mp4",
  frame_centro_ms: 5000,
  created_at: "2026-09-15T00:00:00.000Z",
  updated_at: "2026-09-15T00:00:00.000Z",
}

function paramsPropuesta(propuestaIdParam = propuestaId) {
  return { params: Promise.resolve({ id: projectId, productoId, propuestaId: propuestaIdParam }) }
}

function request(path: string, method = "POST", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  })
}

function authorizedAccess(rol: "admin" | "disenador" = "disenador") {
  access.value = {
    ok: true,
    session: { usuario: "disenador@test.com", nombre: "Diseñador Test", rol },
    supabase: null as unknown as SupabaseClient,
  }
  return access.value
}

describe("POST /api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/duplicar", () => {
  beforeEach(() => {
    authorizedAccess()
    vi.clearAllMocks()
  })

  it("duplica con titulo (Copia)", async () => {
    const clone = { ...propuestaOriginal, id: "propuesta-copia", titulo: "Original (Copia)", orden: 2 }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: propuestaOriginal, error: null }, // find original
        { data: { orden: 1 }, error: null },     // max orden
        { data: clone, error: null },            // insert clone
      ],
      propuestas_3d_animaciones: [
        { data: [], error: null },               // fetch animations
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`)
    const response = await POST(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.titulo).toBe("Original (Copia)")
  })

  it("copia tiene estado borrador y publicada_portafolio=false", async () => {
    const clone = {
      ...propuestaOriginal,
      id: "propuesta-copia",
      titulo: "Original (Copia)",
      estado: "borrador",
      publicada_portafolio: false,
      link_activo: false,
      link_token: null,
    }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: { ...propuestaOriginal, estado: "enviada", publicada_portafolio: true }, error: null },
        { data: { orden: 1 }, error: null },
        { data: clone, error: null },
      ],
      propuestas_3d_animaciones: [
        { data: [], error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`)
    const response = await POST(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.estado).toBe("borrador")
    expect(body.propuesta.publicada_portafolio).toBe(false)
  })

  it("devuelve 403 rol no autorizado", async () => {
    access.value = { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) }
    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`)
    const response = await POST(req, paramsPropuesta())
    expect(response.status).toBe(403)
  })

  it("devuelve 404 propuesta no existe", async () => {
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: null, error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/inexistente/duplicar`)
    const response = await POST(req, paramsPropuesta("inexistente"))
    expect(response.status).toBe(404)
  })

  it("orden incremental (max+1)", async () => {
    const clone = { ...propuestaOriginal, id: "propuesta-copia", orden: 2 }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: propuestaOriginal, error: null },
        { data: { orden: 1 }, error: null },
        { data: clone, error: null },
      ],
      propuestas_3d_animaciones: [
        { data: [], error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`)
    const response = await POST(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.orden).toBe(2)
  })

  it("ID nuevo diferente", async () => {
    const clone = { ...propuestaOriginal, id: "propuesta-nueva-id" }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: propuestaOriginal, error: null },
        { data: { orden: 1 }, error: null },
        { data: clone, error: null },
      ],
      propuestas_3d_animaciones: [
        { data: [], error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}/duplicar`)
    const response = await POST(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.id).not.toBe(propuestaId)
  })
})