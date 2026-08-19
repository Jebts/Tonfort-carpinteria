import { createHmac, timingSafeEqual, randomBytes, scrypt } from "crypto"

const SALT_LEN = 16
const KEY_LEN = 64
const N = 16384
const p = 1
const r = 8

export const COOKIE_NAME = "tonfort_staff"
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

export interface Sesion {
  usuario: string
  nombre: string
}

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.CARPINTERIA_SESSION_SECRET
  if (!s) {
    throw new Error("SESSION_SECRET no está definido. Define SESSION_SECRET o CARPINTERIA_SESSION_SECRET en el entorno.")
  }
  return s
}

function scryptAsync(password: Buffer, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N, p, r }, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })
}

async function hashPassword(password: string, salt?: Buffer): Promise<string> {
  const buf = Buffer.from(password, "utf8")
  const saltBuf = salt ?? randomBytes(SALT_LEN)
  const key = await scryptAsync(buf, saltBuf, KEY_LEN)
  return `${saltBuf.toString("base64url")}:${key.toString("base64url")}`
}

export async function hashPasswordForEnv(password: string): Promise<string> {
  return hashPassword(password)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Separador ":" (no "$") para no chocar con la interpolación de variables de
  // @next/env / docker-compose, que truncan cualquier valor con "$".
  const [saltB64, hashB64] = stored.split(":")
  if (!saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, "base64url")
  const expected = Buffer.from(hashB64, "base64url")
  const key = await scryptAsync(Buffer.from(password, "utf8"), salt, expected.length)
  if (key.length !== expected.length) return false
  return timingSafeEqual(key, expected)
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url")
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function firmarSesion(sesion: Sesion): string {
  const payload = Buffer.from(
    JSON.stringify({ ...sesion, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url")
  return `${payload}.${sign(payload)}`
}

export function verificarToken(token?: string | null): { ok: boolean; sesion?: Sesion } {
  if (!token) return { ok: false }
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return { ok: false }
  if (!constantTimeEqual(sig, sign(payload))) return { ok: false }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (!data.exp || data.exp < Date.now()) return { ok: false }
    if (!data.usuario || !data.nombre) return { ok: false }
    return { ok: true, sesion: { usuario: data.usuario, nombre: data.nombre } }
  } catch {
    return { ok: false }
  }
}

export interface StaffCredential {
  usuario: string
  password_hash?: string
  password?: string
  nombre: string
}

export async function validarCredenciales(usuario: string, password: string): Promise<Sesion | null> {
  const raw = process.env.STAFF_CREDENTIALS
  if (!raw) return null
  try {
    const lista = JSON.parse(raw) as StaffCredential[]
    const encontrado = lista.find((c) => c.usuario === usuario)
    if (!encontrado) return null
    let ok = false
    if (encontrado.password_hash) {
      ok = await verifyPassword(password, encontrado.password_hash)
    } else if (typeof encontrado.password === "string") {
      ok = password === encontrado.password
    }
    if (!ok) return null
    return { usuario: encontrado.usuario, nombre: encontrado.nombre }
  } catch {
    return null
  }
}
