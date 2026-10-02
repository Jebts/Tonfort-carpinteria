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

import { DELETE, GET, PATCH, PUT } from "@/app/api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/[propuestaId]/route"
import { GET as LIST, POST as CREATE } from "@/app/api/staff/diseno/proyectos/[id]/productos/[productoId]/propuestas/route"
import { makeSupabase } from "./helpers/supabase"

const projectId = "project-1"
const productoId = "product-1"
const propuestaId = "proposal-1"

const proposal = {
  id: propuestaId,
  producto_id: productoId,
  titulo: "Estándar",
  descripcion: "Descripción",
  video_global_url: null,
  frame_centro_ms: null,
  orden: 0,
  estado: "borrador",
  link_token: null,
  link_activo: false,
  publicada_portafolio: false,
  created_at: "2026-09-15T00:00:00.000Z",
  updated_at: "2026-09-15T00:00:00.000Z",
}

function params() {
  return { params: Promise.resolve({ id: projectId, productoId }) }
}

function paramsPropuesta(propuestaIdParam = propuestaId) {
  return { params: Promise.resolve({ id: projectId, productoId, propuestaId: propuestaIdParam }) }
}

function request(path: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  })
}

function authorizedAccess() {
  access.value = {
    ok: true,
    session: { usuario: "disenador@test.com", nombre: "Diseñador Test", rol: "disenador" },
    supabase: null as unknown as SupabaseClient,
  }
  return access.value
}

describe("propuestas API video-only", () => {
  beforeEach(() => {
    authorizedAccess()
    vi.clearAllMocks()
  })

  it("lista propuestas del producto", async () => {
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: [proposal], error: null },
      ],
    }) as unknown as SupabaseClient

    const response = await LIST(request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas`), params())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuestas).toHaveLength(1)
    expect(body.propuestas[0].id).toBe(propuestaId)
  })

  it("crea una propuesta con título y descripción", async () => {
    authorizedAccess().supabase = makeSupabase({
      productos: [
        { data: { id: productoId }, error: null }, // verifica producto
      ],
      propuestas_3d: [
        { data: proposal, error: null },           // insert
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas`, "POST", {
      titulo: "Propuesta A",
      descripcion: "Detalles",
    })
    const response = await CREATE(req, params())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.propuesta.titulo).toBe("Estándar")
  })

  it("obtiene una propuesta por ID", async () => {
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: proposal, error: null },
      ],
    }) as unknown as SupabaseClient

    const response = await GET(request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`), paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.id).toBe(propuestaId)
  })

  it("edita título y descripción con PUT", async () => {
    const updated = { ...proposal, titulo: "Nuevo Título", descripcion: "Nueva Desc" }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: updated, error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`, "PUT", {
      titulo: "Nuevo Título",
      descripcion: "Nueva Desc",
    })
    const response = await PUT(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.titulo).toBe("Nuevo Título")
  })

  it("edita frame_centro_ms", async () => {
    const updated = { ...proposal, frame_centro_ms: 4500 }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: updated, error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`, "PUT", {
      frame_centro_ms: 4500,
    })
    const response = await PUT(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.frame_centro_ms).toBe(4500)
  })

  it("cambia estado borrador -> lista para diseñador", async () => {
    const readyProposal = {
      ...proposal,
      video_global_url: "https://example.com/video.mp4",
      frame_centro_ms: 3000,
    }
    const updated = { ...readyProposal, estado: "lista" }
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: readyProposal, error: null }, // find
        { data: updated, error: null },       // update
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`, "PATCH", {
      estado: "lista",
    })
    const response = await PATCH(req, paramsPropuesta())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.propuesta.estado).toBe("lista")
  })

  it("rechaza transición no permitida para diseñador (borrador -> enviada)", async () => {
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: proposal, error: null },
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`, "PATCH", {
      estado: "enviada",
    })
    const response = await PATCH(req, paramsPropuesta())
    expect(response.status).toBe(403)
  })

  it("elimina una propuesta con DELETE", async () => {
    authorizedAccess().supabase = makeSupabase({
      propuestas_3d: [
        { data: proposal, error: null }, // find
        { data: null, error: null },     // delete
      ],
    }) as unknown as SupabaseClient

    const req = request(`/api/staff/diseno/proyectos/${projectId}/productos/${productoId}/propuestas/${propuestaId}`, "DELETE")
    const response = await DELETE(req, paramsPropuesta())
    expect(response.status).toBe(200)
  })
})
