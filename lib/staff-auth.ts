import { cookies } from "next/headers"

// Credenciales fijas del staff (prototipo).
// Para cambiarlas en producción, define STAFF_USERNAME y STAFF_PASSWORD como variables de entorno.
export const STAFF_USERNAME = process.env.STAFF_USERNAME ?? "tonfort"
export const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "tonfort2024"

const COOKIE_NAME = "tonfort_staff"
const COOKIE_VALUE = "authenticated"

export function verifyCredentials(username: string, password: string) {
  return username === STAFF_USERNAME && password === STAFF_PASSWORD
}

export async function createStaffSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  })
}

export async function destroyStaffSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isStaffAuthenticated() {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value === COOKIE_VALUE
}
