import { describe, it, expect, beforeAll } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "@/proxy"
import { makeToken } from "./helpers/route"

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-proxy"
})

function req(url: string, cookie?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  return new NextRequest(url, { headers })
}

describe("proxy (middleware)", () => {
  it("/staff/login pasa (next)", () => {
    const res = proxy(req("http://localhost/staff/login"))
    expect(res.status).toBe(200)
  })

  it("/api/staff/login pasa (next)", () => {
    const res = proxy(req("http://localhost/api/staff/login"))
    expect(res.status).toBe(200)
  })

  it("/staff/oculto sin cookie → redirect 307 a /staff/login?redirect=", () => {
    const res = proxy(req("http://localhost/staff/oculto"))
    expect(res.status).toBe(307)
    const loc = res.headers.get("location") ?? ""
    expect(loc).toContain("/staff/login")
    expect(loc).toContain("redirect=")
  })

  it("/api/staff/x sin cookie → 401", () => {
    const res = proxy(req("http://localhost/api/staff/x"))
    expect(res.status).toBe(401)
  })

  it("con cookie válida → next (200)", () => {
    const token = makeToken()
    const res = proxy(req("http://localhost/staff/oculto", `tonfort_staff=${token}`))
    expect(res.status).toBe(200)
  })

  it("con cookie alterada → 401 en api", () => {
    const res = proxy(req("http://localhost/api/staff/x", "tonfort_staff=abc.def"))
    expect(res.status).toBe(401)
  })
})
