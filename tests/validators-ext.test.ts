import { describe, it, expect } from "vitest"
import {
  citaPublicaSchema,
  clienteSchema,
  proyectoSchema,
  loginSchema,
  aiSuggestSchema,
  citaAccionSchema,
} from "@/lib/validators"

describe("citaPublicaSchema", () => {
  it("acepta datos mínimos válidos (sin email, con modalidad)", () => {
    expect(
      citaPublicaSchema.safeParse({
        nombre: "Juan",
        telefono: "3001234567",
        descripcion: "una mesa",
        fecha_hora: "2026-08-20T10:00:00.000Z",
        modalidad: "virtual",
      }).success,
    ).toBe(true)
  })

  it("acepta descripción vacía (opcional)", () => {
    expect(
      citaPublicaSchema.safeParse({
        nombre: "Juan",
        telefono: "3001234567",
        descripcion: "",
        fecha_hora: "2026-08-20T10:00:00.000Z",
        modalidad: "presencial",
        direccion: "Cra 10 # 20-30",
      }).success,
    ).toBe(true)
  })

  it("acepta descripcion null (lo que manda el formulario público)", () => {
    // El cliente envía `descripcion: null` cuando el usuario no escribe nada:
    // con `.optional()` (sin null) estas solicitudes morían con 422 y nadie
    // podía agendar sin descripción.
    expect(
      citaPublicaSchema.safeParse({
        nombre: "Juan",
        telefono: "3001234567",
        descripcion: null,
        fecha_hora: "2026-08-20T10:00:00.000Z",
        modalidad: "virtual",
      }).success,
    ).toBe(true)
  })

  it("normaliza descripcion vacía o nula a null", () => {
    const vacia = citaPublicaSchema.parse({
      nombre: "Juan",
      telefono: "3001234567",
      descripcion: "",
      fecha_hora: "2026-08-20T10:00:00.000Z",
      modalidad: "virtual",
    })
    const nula = citaPublicaSchema.parse({
      nombre: "Juan",
      telefono: "3001234567",
      descripcion: null,
      fecha_hora: "2026-08-20T10:00:00.000Z",
      modalidad: "virtual",
    })
    expect(vacia.descripcion).toBeNull()
    expect(nula.descripcion).toBeNull()
  })

  it("rechaza nombre corto y modalidad fuera del catálogo", () => {
    expect(
      citaPublicaSchema.safeParse({
        nombre: "J",
        telefono: "3001234567",
        descripcion: "una mesa",
        fecha_hora: "2026-08-20T10:00:00.000Z",
        modalidad: "híbrida",
      }).success,
    ).toBe(false)
  })

  it("rechaza descripción de un solo carácter", () => {
    expect(
      citaPublicaSchema.safeParse({
        nombre: "Juan",
        telefono: "3001234567",
        descripcion: "x",
        fecha_hora: "2026-08-20T10:00:00.000Z",
        modalidad: "virtual",
      }).success,
    ).toBe(false)
  })
})

describe("clienteSchema.partial", () => {
  it("acepta actualización parcial (solo nombre)", () => {
    expect(clienteSchema.partial().safeParse({ nombre: "Ana" }).success).toBe(true)
  })

  it("rechaza email inválido en parcial", () => {
    expect(clienteSchema.partial().safeParse({ email: "x" }).success).toBe(false)
  })

  it("acepta fase enum", () => {
    expect(clienteSchema.partial().safeParse({ fase: "egresado" }).success).toBe(true)
  })
})

describe("proyectoSchema", () => {
  it("acepta título y slug válidos", () => {
    expect(
      proyectoSchema.safeParse({
        cliente_id: "550e8400-e29b-41d4-a716-446655440000",
        titulo: "Cocina X",
        slug: "cocina-x",
      }).success,
    ).toBe(true)
  })

  it("rechaza slug vacío", () => {
    expect(
      proyectoSchema.safeParse({
        cliente_id: "550e8400-e29b-41d4-a716-446655440000",
        titulo: "X",
        slug: "",
      }).success,
    ).toBe(false)
  })
})

describe("loginSchema", () => {
  it("requiere usuario y password no vacío", () => {
    expect(loginSchema.safeParse({ usuario: "admin", password: "password123" }).success).toBe(true)
    expect(loginSchema.safeParse({ usuario: "test@example.com", password: "password123" }).success).toBe(true)
    expect(loginSchema.safeParse({ usuario: "", password: "password123" }).success).toBe(false)
    expect(loginSchema.safeParse({ usuario: "admin", password: "" }).success).toBe(false)
  })
})

describe("aiSuggestSchema", () => {
  it("acepta campo + contexto + promptExtra opcional", () => {
    expect(
      aiSuggestSchema.safeParse({ campo: "Resumen", contexto: { titulo: "X" }, promptExtra: "breve" })
        .success,
    ).toBe(true)
  })

  it("rechaza campo vacío", () => {
    expect(aiSuggestSchema.safeParse({ campo: "" }).success).toBe(false)
  })
})

describe("citaAccionSchema", () => {
  it("acepta cada acción", () => {
    for (const accion of ["aceptar", "cancelar", "mover", "eliminar", "reenviar"]) {
      expect(citaAccionSchema.safeParse({ accion }).success).toBe(true)
    }
  })

  it("rechaza acción desconocida", () => {
    expect(citaAccionSchema.safeParse({ accion: "borrar" }).success).toBe(false)
  })
})
