"use server"

import { verifyCredentials, createStaffSession, destroyStaffSession } from "@/lib/staff-auth"
import { redirect } from "next/navigation"

export async function staffLogin(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!verifyCredentials(username, password)) {
    return { error: "Usuario o contraseña incorrectos." }
  }

  await createStaffSession()
  redirect("/staff")
}

export async function staffLogout() {
  await destroyStaffSession()
  redirect("/")
}
