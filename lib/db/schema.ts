import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  phase: text("phase").notNull().default("descubrimiento"),
  projectNotes: text("project_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectDescription: text("project_description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  // status: 'en_espera' | 'aceptada' | 'cancelada'
  status: text("status").notNull().default("en_espera"),
  // source: 'web' | 'staff'
  source: text("source").notNull().default("web"),
  meetLink: text("meet_link"),
  staffNotes: text("staff_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location"),
  year: text("year"),
  category: text("category"),
  summary: text("summary"),
  story: text("story"),
  coverImage: text("cover_image"),
  videoUrl: text("video_url"),
  published: integer("published").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type Appointment = typeof appointments.$inferSelect
export type Project = typeof projects.$inferSelect
