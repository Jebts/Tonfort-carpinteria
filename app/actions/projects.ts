"use server"

import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { isStaffAuthenticated } from "@/lib/staff-auth"

// --- PUBLIC: only published projects, ordered ---
export async function getPublicProjects() {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.published, 1))
    .orderBy(asc(projects.sortOrder), asc(projects.id))
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export async function getProjectBySlug(slug: string) {
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug))
  if (!row) return null
  return { ...row, createdAt: row.createdAt.toISOString() }
}

// --- STAFF: all projects for the portfolio manager ---
export async function getAllProjects() {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const rows = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id))
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function createProject(input: {
  title: string
  category?: string
  location?: string
  year?: string
  summary?: string
  story?: string
  coverImage?: string
  videoUrl?: string
  published?: boolean
  sortOrder?: number
}) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  if (!input.title?.trim()) return { ok: false, error: "El título es obligatorio." }

  const base = slugify(input.title)
  const slug = `${base || "proyecto"}-${Date.now().toString(36)}`

  await db.insert(projects).values({
    slug,
    title: input.title.trim(),
    category: input.category?.trim() || null,
    location: input.location?.trim() || null,
    year: input.year?.trim() || null,
    summary: input.summary?.trim() || null,
    story: input.story?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    videoUrl: input.videoUrl?.trim() || null,
    published: input.published === false ? 0 : 1,
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
    category?: string
    location?: string
    year?: string
    summary?: string
    story?: string
    coverImage?: string
    videoUrl?: string
    published?: boolean
    sortOrder?: number
  },
) {
  if (!(await isStaffAuthenticated())) throw new Error("Unauthorized")
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.category !== undefined) patch.category = input.category.trim() || null
  if (input.location !== undefined) patch.location = input.location.trim() || null
  if (input.year !== undefined) patch.year = input.year.trim() || null
  if (input.summary !== undefined) patch.summary = input.summary.trim() || null
  if (input.story !== undefined) patch.story = input.story.trim() || null
  if (input.coverImage !== undefined) patch.coverImage = input.coverImage.trim() || null
  if (input.videoUrl !== undefined) patch.videoUrl = input.videoUrl.trim() || null
  if (input.published !== undefined) patch.published = input.published ? 1 : 0
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder

  await db.update(projects).set(patch).where(eq(projects.id, id))
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
