import { describe, it, expect, vi, afterEach } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadContact() {
  vi.resetModules()
  return (await import("@/lib/contact")) as typeof import("@/lib/contact")
}

describe("contact URLs (defaults)", () => {
  it("usa el valor configurado (o el default) cuando no hay NEXT_PUBLIC_* stubbeados", async () => {
    const c = await loadContact()
    expect(c.WHATSAPP_URL).toContain("3127916632")
    expect(c.INSTAGRAM_URL).toContain("tonfort.muebles")
    expect(c.EMAIL_URL).toContain("hola@tonfort.com")
  })
})

describe("contact URLs (stubbeadas)", () => {
  it("respeta NEXT_PUBLIC_WHATSAPP_NUMBER / INSTAGRAM_HANDLE / EMAIL", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "573001112233")
    vi.stubEnv("NEXT_PUBLIC_INSTAGRAM_HANDLE", "mi.taller")
    vi.stubEnv("NEXT_PUBLIC_EMAIL", "ventas@taller.com")
    const c = await loadContact()
    expect(c.WHATSAPP_URL).toContain("573001112233")
    expect(c.INSTAGRAM_URL).toBe("https://instagram.com/mi.taller")
    expect(c.EMAIL_URL).toBe("mailto:ventas@taller.com")
    expect(c.EMAIL).toBe("ventas@taller.com")
  })
})
