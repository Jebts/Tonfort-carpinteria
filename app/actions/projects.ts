"use server"

import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isStaffAuthenticated } from "@/lib/staff-auth"

// --- PUBLIC: only published projects, ordered ---
export async function getPublishedProjects() {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.published, 1))
    .orderBy(asc(projects.sortOrder), asc(projects.id))
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

// --- STAFF: all projects ---
export async function getAllProjects() {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const rows = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id))
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export async function createProject(input: {
  title: string
  location?: string
  year?: string
  category?: string
  summary?: string
  story?: string
  coverImage?: string
  videoUrl?: string
  published?: number
  sortOrder?: number
}) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  if (!input.title?.trim()) return { ok: false, error: "El título es obligatorio." }
  await db.insert(projects).values({
    title: input.title.trim(),
    location: input.location?.trim() || null,
    year: input.year?.trim() || null,
    category: input.category?.trim() || null,
    summary: input.summary?.trim() || null,
    story: input.story?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    videoUrl: input.videoUrl?.trim() || null,
    published: input.published ?? 1,
    sortOrder: input.sortOrder ?? 0,
  })
  revalidatePath("/proyectos")
  revalidatePath("/staff")
  return { ok: true }
}

export async function updateProject(
  id: number,
  input: {
    title?: string
    location?: string
    year?: string
    category?: string
    summary?: string
    story?: string
    coverImage?: string
    videoUrl?: string
    published?: number
    sortOrder?: number
  },
) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.update(projects).set(input).where(eq(projects.id, id))
  revalidatePath("/proyectos")
  revalidatePath("/staff")
  return { ok: true }
}

export async function deleteProject(id: number) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath("/proyectos")
  revalidatePath("/staff")
  return { ok: true }
}
