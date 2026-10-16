import { beforeEach, describe, expect, it } from "vitest"
import { act, render, screen, fireEvent } from "@testing-library/react"
import { SedeMapa } from "@/components/tonfort/sede-mapa"
import { SEDE, SEDE_PENDIENTE_DATOS } from "@/lib/contact"

const EMBED_BASE = "https://www.google.com/maps/embed"
const PLACE_ID = "0x8ef4f561b920be33%3A0xc65ae35ceb171e9"
const MAPA_URL = "https://maps.app.goo.gl/LdPiH9VeyGJf4bieA"
const DIRECCION = "Cra 33 Cl 14-31, Galicia, Santa Marta"

type Entrada = { isIntersecting: boolean }
type Callback = (entradas: Entrada[]) => void

let disparar: Callback | null = null

class IntersectionObserverMock {
  constructor(cb: Callback) {
    disparar = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): Entrada[] {
    return []
  }
}

beforeEach(() => {
  disparar = null
  globalThis.IntersectionObserver =
    IntersectionObserverMock as unknown as typeof IntersectionObserver
})

function asomar() {
  act(() => {
    disparar?.([{ isIntersecting: true }])
  })
}

describe("SedeMapa", () => {
  it("no monta el iframe hasta que la sección asoma y muestra el pin mientras carga", () => {
    render(<SedeMapa embedUrl={EMBED_BASE} direccion={DIRECCION} />)

    expect(disparar).not.toBeNull()
    expect(screen.queryByTitle(`Ubicación de la sede de Tonfort: ${DIRECCION}`)).not.toBeInTheDocument()
    expect(screen.getByText("Cargando el mapa…")).toBeInTheDocument()

    asomar()

    const iframe = screen.getByTitle(`Ubicación de la sede de Tonfort: ${DIRECCION}`)
    expect(iframe).toHaveAttribute("src", EMBED_BASE)
    expect(iframe).toHaveAttribute("loading", "eager")

    fireEvent.load(iframe)
    expect(screen.queryByText("Cargando el mapa…")).not.toBeInTheDocument()
  })

  it("abre las conexiones a Google antes del iframe", () => {
    render(<SedeMapa embedUrl={EMBED_BASE} direccion={DIRECCION} />)

    const preconnect = Array.from(document.head.querySelectorAll('link[rel="preconnect"]'))
    const hrefs = preconnect.map((l) => l.getAttribute("href"))
    expect(hrefs).toContain("https://www.google.com")
    expect(hrefs).toContain("https://maps.gstatic.com")
  })

  it("SEDE usa el embed de la ficha de Google y el enlace corto para llegar", () => {
    expect(SEDE.mapsEmbedUrl.startsWith(`${EMBED_BASE}?pb=`)).toBe(true)
    expect(SEDE.mapsEmbedUrl).toContain(PLACE_ID)
    expect(SEDE.mapsUrl).toBe(MAPA_URL)
    expect(SEDE_PENDIENTE_DATOS).toBe(false)
  })
})
