import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const h = vi.hoisted(() => ({ auth: true }))
vi.mock("@/lib/staff-auth", () => ({
  requireStaff: () =>
    h.auth
      ? null
      : new NextResponse(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
}))
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
  BACKEND_NO_CONFIGURADO: "Backend no configurado",
}))

import { PATCH, PUT, DELETE } from "@/app/api/staff/citas/[id]/route"
import { getServiceSupabase } from "@/lib/supabase/server"
import { resetCachedTableName } from "@/lib/citas-service"
import { makeSupabase } from "./helpers/supabase"

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const f = () => new Date(Date.now() + 5 * 86_400_000).toISOString()
const PENDIENTE = "11111111-1111-4111-8111-111111111111"
const AJENO = "22222222-2222-4222-8222-222222222222"

function patch(id: string, body: unknown, queue?: Record<string, never[]>): Promise<Response> {
  if (queue) vi.mocked(getServiceSupabase).mockReturnValue(makeSupabase(queue) as never)
  return PATCH(
    new NextRequest(`http://localhost/api/staff/citas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    params(id),
  )
}

function put(id: string, body: unknown): Promise<Response> {
  return PUT(
    new NextRequest(`http://localhost/api/staff/citas/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    params(id),
  )
}

beforeEach(() => {
  h.auth = true
  vi.mocked(getServiceSupabase).mockReset()
  resetCachedTableName()
})

describe("PATCH /api/staff/citas/[id]", () => {
  it("404 cuando no existe", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: null, error: null }] }) as never,
    )
    const res = await patch("x", { accion: "cancelar" })
    expect(res.status).toBe(404)
  })

  it("aceptar → 200 estado aceptada", async () => {
    const ff = f()
    const res = await patch("a", { accion: "aceptar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera", fecha_hora: ff, movida: false }, error: null },
        // Sin otras en_espera del bloque: confirma directo.
        { data: [], error: null },
        { data: { id: "a", estado: "aceptada" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cita.estado).toBe("aceptada")
    expect(data.resueltas).toBe(0)
  })

  it("aceptar una cita que no está en_espera → 422", async () => {
    const res = await patch("a", { accion: "aceptar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "aceptada" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(422)
  })

  it("aceptar con otras en_espera del bloque y sin resolución → 422 con la lista", async () => {
    const ff = f()
    const res = await patch("a", { accion: "aceptar" }, {
      citas: [
        { data: null, error: null },
        {
          data: { id: "a", estado: "en_espera", fecha_hora: ff, modalidad_id: "m1" },
          error: null,
        },
        {
          data: [
            {
              id: PENDIENTE,
              estado: "en_espera",
              nombre_solicitante: "Otro",
              fecha_hora: ff,
              duracion_minutos: 120,
            },
          ],
          error: null,
        },
      ],
    } as never)
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.pendientes).toHaveLength(1)
    expect(data.pendientes[0].id).toBe(PENDIENTE)
  })

  it("aceptar con resolución incompleta → 422", async () => {
    const ff = f()
    const conPendiente = {
      citas: [
        { data: null, error: null },
        {
          data: { id: "a", estado: "en_espera", fecha_hora: ff, modalidad_id: "m1" },
          error: null,
        },
        {
          data: [
            {
              id: PENDIENTE,
              estado: "en_espera",
              nombre_solicitante: "Otro",
              fecha_hora: ff,
              duracion_minutos: 120,
            },
          ],
          error: null,
        },
      ],
    } as never
    const sinNinguna = await patch("a", { accion: "aceptar", resolucion: [] }, conPendiente)
    expect(sinNinguna.status).toBe(422)

    resetCachedTableName()
    const conExtra = await patch(
      "a",
      {
        accion: "aceptar",
        resolucion: [
          { id: PENDIENTE, accion: "eliminar" },
          { id: AJENO, accion: "eliminar" },
        ],
      },
      conPendiente,
    )
    expect(conExtra.status).toBe(422)
  })

  it("aceptar con el bloque ya confirmado → 409", async () => {
    const ff = f()
    const res = await patch("a", { accion: "aceptar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera", fecha_hora: ff, modalidad_id: "m1" }, error: null },
        {
          data: [
            {
              id: "ocupante",
              estado: "aceptada",
              nombre_solicitante: "Ocupado",
              fecha_hora: ff,
              duracion_minutos: 120,
            },
          ],
          error: null,
        },
      ],
    } as never)
    expect(res.status).toBe(409)
  })

  it("aceptar resolviendo la pendiente con mover → 200 y resueltas 1", async () => {
    const ff = f()
    // Destino en otro bloque: mover al mismo que se confirma está rechazado.
    const destino = new Date(new Date(ff).getTime() + 24 * 60 * 60 * 1000).toISOString()
    const res = await patch(
      "a",
      {
        accion: "aceptar",
        resolucion: [{ id: PENDIENTE, accion: "mover", fecha_hora: destino }],
      },
      {
        citas: [
          { data: null, error: null },
          {
            data: { id: "a", estado: "en_espera", fecha_hora: ff, modalidad_id: "m1" },
            error: null,
          },
          {
            data: [
              {
                id: PENDIENTE,
                estado: "en_espera",
                nombre_solicitante: "Otro",
                fecha_hora: ff,
                duracion_minutos: 120,
              },
            ],
            error: null,
          },
          // Destino libre.
          { data: [], error: null },
          { data: { id: PENDIENTE, fecha_hora: destino, movida: true }, error: null },
          { data: { id: "a", estado: "aceptada" }, error: null },
        ],
      } as never,
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cita.estado).toBe("aceptada")
    expect(data.resueltas).toBe(1)
  })

  it("aceptar resolviendo la pendiente con eliminar → 200 y resueltas 1", async () => {
    const ff = f()
    const res = await patch(
      "a",
      {
        accion: "aceptar",
        resolucion: [{ id: PENDIENTE, accion: "eliminar" }],
      },
      {
        citas: [
          { data: null, error: null },
          {
            data: { id: "a", estado: "en_espera", fecha_hora: ff, modalidad_id: "m1" },
            error: null,
          },
          {
            data: [
              {
                id: PENDIENTE,
                estado: "en_espera",
                nombre_solicitante: "Otro",
                fecha_hora: ff,
                duracion_minutos: 120,
              },
            ],
            error: null,
          },
          { data: null, error: null },
          { data: { id: "a", estado: "aceptada" }, error: null },
        ],
      } as never,
    )
    expect(res.status).toBe(200)
    expect((await res.json()).resueltas).toBe(1)
  })

  it("cancelar → 200 estado cancelada", async () => {
    const res = await patch("a", { accion: "cancelar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera" }, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).cita.estado).toBe("cancelada")
  })

  it("reenviar → 200 estado en_espera", async () => {
    const res = await patch("a", { accion: "reenviar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
        { data: { id: "a", estado: "en_espera" }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).cita.estado).toBe("en_espera")
  })

  it("mover sin fecha_hora → 422", async () => {
    const res = await patch("a", { accion: "mover" }, {
      citas: [{ data: null, error: null }, { data: { id: "a", estado: "en_espera" }, error: null }],
    } as never)
    expect(res.status).toBe(422)
  })

  it("mover con fecha_hora → 200", async () => {
    const ff = f()
    const res = await patch("a", { accion: "mover", fecha_hora: ff }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "en_espera", fecha_hora: f() }, error: null },
        // validarSlotLibre del destino: está libre.
        { data: [], error: null },
        { data: { id: "a", fecha_hora: ff, movida: true }, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
  })

  it("mover a un bloque con aceptada → 409", async () => {
    const ff = f()
    const res = await patch("a", { accion: "mover", fecha_hora: ff }, {
      citas: [
        { data: null, error: null },
        {
          data: {
            id: "a",
            estado: "en_espera",
            fecha_hora: f(),
            modalidad_id: "m1",
            duracion_minutos: 120,
          },
          error: null,
        },
        // El destino lo ocupa una aceptada de la misma modalidad.
        {
          data: [
            { id: "ocupante", nombre_solicitante: "Ocupado", fecha_hora: ff, duracion_minutos: 120 },
          ],
          error: null,
        },
      ],
    } as never)
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.conflicto.id).toBe("ocupante")
  })

  it("eliminar con estado cancelada → 200", async () => {
    const res = await patch("a", { accion: "eliminar" }, {
      citas: [
        { data: null, error: null },
        { data: { id: "a", estado: "cancelada" }, error: null },
        { data: null, error: null },
      ],
    } as never)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it("eliminar con estado aceptada → 422", async () => {
    const res = await patch("a", { accion: "eliminar" }, {
      citas: [{ data: null, error: null }, { data: { id: "a", estado: "aceptada" }, error: null }],
    } as never)
    expect(res.status).toBe(422)
  })
})

describe("PUT/DELETE /api/staff/citas/[id]", () => {
  it("PUT actualiza → 200", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: { id: "a" }, error: null }] }) as never,
    )
    const res = await put("a", { notas: "recordar" })
    expect(res.status).toBe(200)
  })

  it("DELETE → 200 ok", async () => {
    vi.mocked(getServiceSupabase).mockReturnValue(
      makeSupabase({ citas: [{ data: null, error: null }, { data: null, error: null }] }) as never,
    )
    const res = await DELETE(new NextRequest("http://localhost/api/staff/citas/a"), params("a"))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
