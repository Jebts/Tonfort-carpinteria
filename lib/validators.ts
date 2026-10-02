import { z } from "zod"

// Esquemas de validación (zod) reutilizados por los Route Handlers.

// Agenda pública. Solo 3 campos: Nombre, WhatsApp y Descripción (opcional).
// No hay email: la dedup de clientes es por teléfono.
export const MODALIDADES_PUBLICAS = ["virtual", "presencial"] as const

export const citaPublicaSchema = z.object({
  nombre: z.string().min(2, "Escribe tu nombre").max(120),
  telefono: z.string().min(7, "WhatsApp no válido").max(40),
  // Opcional: "" se normaliza a null para no guardar cadenas vacías.
  descripcion: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => {
      const limpio = (v ?? "").trim()
      return limpio.length === 0 ? null : limpio
    })
    .refine((v) => v === null || v.length >= 5, "Cuéntanos un poco del proyecto"),
  fecha_hora: z.string().min(1, "Elige un horario"),
  modalidad: z.enum(MODALIDADES_PUBLICAS, {
    errorMap: () => ({ message: "Elige una modalidad" }),
  }),
  direccion: z.string().max(400).nullable().optional(),
})

export const clienteSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email().nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  fase: z.enum(["descubrimiento", "evaluacion", "implementacion", "egresado"]).optional(),
  info_personal: z.record(z.string()).optional(),
  descripcion_proyecto: z.string().max(4000).nullable().optional(),
})

export const citaStaffSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  nombre_solicitante: z.string().max(120).nullable().optional(),
  email: z.string().email().nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  fecha_hora: z.string().min(1),
  duracion_minutos: z.number().int().positive().max(600).optional(),
  estado: z.enum(["en_espera", "aceptada", "cancelada"]).optional(),
  origen: z.enum(["web", "interna"]).optional(),
  meet_link: z.string().url().max(2000).nullable().optional(),
  notas: z.string().max(4000).nullable().optional(),
  modalidad_id: z.string().uuid().nullable().optional(),
  precio_copiado: z.number().int().min(0).max(100_000_000).optional(),
  direccion: z.string().max(400).nullable().optional(),
})

export const CATEGORIAS_MUEBLE_SCHEMA = [
  "cocina",
  "closet",
  "mueble_tv",
  "puerta",
  "iluminacion",
  "espacio_integral",
  "otro",
] as const

export const proyectoSchema = z.object({
  cliente_id: z.string().uuid("Cliente requerido"),
  titulo: z.string().min(2).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  slug: z.string().min(2).max(200),
  asignado_a: z.string().uuid().nullable().optional(),
  orden: z.number().int().optional(),
  publicado: z.boolean().optional(),
  sede: z.enum(["santa_marta", "bogota"]).optional(),
  categoria: z.enum(CATEGORIAS_MUEBLE_SCHEMA).nullable().optional(),
  portada_url: z.string().url().nullable().optional(),
})

export const loginSchema = z.object({
  usuario: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
})

// Sugerencia de IA por campo del formulario de proyectos.
// `contexto` son los demás campos del formulario; `promptExtra` es opcional.
export const aiSuggestSchema = z.object({
  campo: z.string().min(1).max(80),
  contexto: z.record(z.string()).default({}),
  promptExtra: z.string().max(4000).optional(),
})

// Acciones sobre cita (PATCH /api/staff/citas/[id])
export const citaAccionSchema = z.object({
  accion: z.enum(["aceptar", "cancelar", "mover", "eliminar", "reenviar"]),
  fecha_hora: z.string().optional(), // requerido para "mover"
})
