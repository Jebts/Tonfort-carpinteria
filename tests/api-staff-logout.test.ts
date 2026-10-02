import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/staff/logout/route"

describe("POST /api/staff/logout", () => {
  it("200 y borra la cookie (maxAge 0)", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const cookie = res.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("tonfort_staff=")
    expect(cookie).toContain("Max-Age=0")
  })
})
