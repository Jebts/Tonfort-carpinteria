import { headers } from "next/headers"

/**
 * Origin base para self-fetchs del servidor (RSC -> Route Handler).
 *
 * Las paginas de staff revalidan datos llamando a sus propias APIs y reenviando
 * la cookie de sesion. Resolver el origin desde `NEXT_PUBLIC_APP_URL` con un
 * fallback fijo a `http://localhost:3000` rompe en cuanto el dev server corre
 * en otro puerto: el fetch falla, el dato llega como null y la pagina redirige.
 *
 * Prioridad: variable de entorno explicita -> header de la peticion actual ->
 * localhost:3000 como ultimo recurso.
 */
export async function getServerOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, "")

  const requestHeaders = await headers()
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("x-forwarded-proto-host") ??
    requestHeaders.get("host")
  if (!host) return "http://localhost:3000"

  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")

  return `${proto}://${host}`
}