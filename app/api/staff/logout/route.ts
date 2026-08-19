import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/staff-auth"

// POST /api/staff/logout
export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
