"use server"

import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"
import { and, asc, eq, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isStaffAuthenticated } from "@/lib/staff-auth"

export type PublicAppointment = {
  id: number
  startsAt: string
  status: string
}

// --- PUBLIC: only expose time + status (no personal data) ---
export async function getPublicAppointments(rangeStart: string, rangeEnd: string): Promise<PublicAppointment[]> {
  const rows = await db
    .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status })
    .from(appointments)
    .where(and(gte(appointments.startsAt, new Date(rangeStart)), lte(appointments.startsAt, new Date(rangeEnd))))
    .orderBy(asc(appointments.startsAt))

  return rows
    .filter((r) => r.status === "aceptada" || r.status === "en_espera")
    .map((r) => ({ id: r.id, startsAt: r.startsAt.toISOString(), status: r.status }))
}

// --- PUBLIC: create a booking request (always 'en_espera') ---
export async function requestAppointment(input: {
  startsAt: string
  clientName: string
  clientEmail: string
  clientPhone: string
  projectDescription: string
}) {
  if (!input.clientName?.trim() || !input.startsAt) {
    return { ok: false, error: "Faltan datos obligatorios." }
  }

  const start = new Date(input.startsAt)

  // Prevent double-booking on an already accepted slot
  const clash = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(eq(appointments.startsAt, start))

  if (clash.some((c) => c.status === "aceptada")) {
    return { ok: false, error: "Ese horario ya fue confirmado. Elige otro." }
  }

  await db.insert(appointments).values({
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail?.trim() || null,
    clientPhone: input.clientPhone?.trim() || null,
    projectDescription: input.projectDescription?.trim() || null,
    startsAt: start,
    status: "en_espera",
    source: "web",
  })

  revalidatePath("/agenda")
  revalidatePath("/staff")
  return { ok: true }
}

// --- STAFF: full appointment records ---
export async function getStaffAppointments(rangeStart: string, rangeEnd: string) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const rows = await db
    .select()
    .from(appointments)
    .where(and(gte(appointments.startsAt, new Date(rangeStart)), lte(appointments.startsAt, new Date(rangeEnd))))
    .orderBy(asc(appointments.startsAt))
  return rows.map((r) => ({ ...r, startsAt: r.startsAt.toISOString(), createdAt: r.createdAt.toISOString() }))
}

export async function getAllStaffAppointments() {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const rows = await db.select().from(appointments).orderBy(asc(appointments.startsAt))
  return rows.map((r) => ({ ...r, startsAt: r.startsAt.toISOString(), createdAt: r.createdAt.toISOString() }))
}

export async function updateAppointmentStatus(id: number, status: "en_espera" | "aceptada" | "cancelada") {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.update(appointments).set({ status }).where(eq(appointments.id, id))
  revalidatePath("/staff")
  revalidatePath("/agenda")
}

export async function moveAppointment(id: number, startsAt: string) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.update(appointments).set({ startsAt: new Date(startsAt) }).where(eq(appointments.id, id))
  revalidatePath("/staff")
  revalidatePath("/agenda")
}

export async function createStaffAppointment(input: {
  clientName: string
  clientEmail?: string
  clientPhone?: string
  projectDescription?: string
  startsAt: string
  status: "en_espera" | "aceptada" | "cancelada"
}) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.insert(appointments).values({
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail?.trim() || null,
    clientPhone: input.clientPhone?.trim() || null,
    projectDescription: input.projectDescription?.trim() || null,
    startsAt: new Date(input.startsAt),
    status: input.status,
    source: "staff",
  })
  revalidatePath("/staff")
  revalidatePath("/agenda")
}

export async function updateAppointmentDetails(
  id: number,
  input: { meetLink?: string; staffNotes?: string; clientName?: string; clientEmail?: string; clientPhone?: string; projectDescription?: string },
) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.update(appointments).set(input).where(eq(appointments.id, id))
  revalidatePath("/staff")
}

// Only 'cancelada' or 'en_espera' can be deleted from history
export async function deleteAppointment(id: number) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const [row] = await db.select({ status: appointments.status }).from(appointments).where(eq(appointments.id, id))
  if (!row) return { ok: false, error: "No existe." }
  if (row.status === "aceptada") {
    return { ok: false, error: "No se puede eliminar una cita aceptada. Cancélala primero." }
  }
  await db.delete(appointments).where(eq(appointments.id, id))
  revalidatePath("/staff")
  return { ok: true }
}
