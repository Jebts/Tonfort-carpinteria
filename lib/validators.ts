import { z } from "zod"

// Esquemas de validación (zod) reutilizados por los Route Handlers.

export const citaPublicaSchema = z.object({
  nombre: z.string().min(2, "Escribe tu nombre").max(120),
  email: z.string().email("Email no válido"),
  telefono: z.string().min(5, "Teléfono no válido").max(40),
  descripcion: z.string().min(5, "Cuéntanos un poco del proyecto").max(2000),
  fecha_hora: z.string().min(1, "Elige un horario"),
  info_personal: z.record(z.string()).optional(),
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
})

export const proyectoSchema = z.object({
  titulo: z.string().min(2).max(200),
  slug: z.string().min(2).max(200),
  resumen: z.string().max(2000).nullable().optional(),
  historia: z.string().nullable().optional(),
  video_url: z.string().url().max(2000).nullable().optional(),
  imagen_portada: z.string().url().max(2000).nullable().optional(),
  categoria: z.string().max(80).nullable().optional(),
  galeria: z.array(z.string()).optional(),
  orden: z.number().int().optional(),
  publicado: z.boolean().optional(),
})

export const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
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
