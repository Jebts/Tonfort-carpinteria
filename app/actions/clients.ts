"use server"

import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isStaffAuthenticated } from "@/lib/staff-auth"

export async function getClients() {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const rows = await db.select().from(clients).orderBy(asc(clients.name))
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export async function updateClient(
  id: number,
  input: {
    name?: string
    email?: string
    phone?: string
    address?: string
    phase?: string
    projectNotes?: string
  },
) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.update(clients).set(input).where(eq(clients.id, id))
  revalidatePath("/staff")
}

export async function createClient(input: {
  name: string
  email?: string
  phone?: string
  address?: string
  phase?: string
  projectNotes?: string
}) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.insert(clients).values({
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    phase: input.phase || "descubrimiento",
    projectNotes: input.projectNotes?.trim() || null,
  })
  revalidatePath("/staff")
}
