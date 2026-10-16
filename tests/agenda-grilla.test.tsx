import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GrillaBloques } from "@/components/tonfort/agenda/grilla-bloques"
import { BLOQUES, DIAS_CORTOS, celdasDeSemana } from "@/lib/agenda"

// Lunes de la semana actual en UTC: la retícula se calcula siempre en UTC.
function lunesActual(): Date {
  const d = new Date()
  const dow = d.getUTCDay()
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((dow + 6) % 7)),
  )
}

function celdasSinCitas(semana: Date) {
  return celdasDeSemana(semana, new Map())
}

describe("GrillaBloques", () => {
  it("pinta 4 filas de bloques x Lun–Sáb y sus números de día en UTC", () => {
    const semana = lunesActual()
    const celdas = celdasSinCitas(semana)
    render(
      <GrillaBloques
        titulo="Semana de prueba"
        celdas={celdas}
        renderCelda={(celda) => <span data-testid="celda">{celda.clave}</span>}
      />,
    )

    // 4 bloques x 6 días = 24 celdas.
    expect(screen.getAllByTestId("celda")).toHaveLength(BLOQUES.length * DIAS_CORTOS.length)
    expect(screen.getByText("Semana de prueba")).toBeInTheDocument()

    // Encabezado: LUN..SÁB con el número de la fecha UTC de cada día.
    for (const dia of DIAS_CORTOS) {
      expect(screen.getByText(dia.label)).toBeInTheDocument()
      expect(
        screen.getByText(String(semana.getUTCDate() + (dia.dow - 1))),
      ).toBeInTheDocument()
    }
  })

  it("celdasDeSemana usa UTC: lunes 12 → primer slot 2026-10-12 08:00", () => {
    const celdas = celdasSinCitas(new Date("2026-10-12T00:00:00.000Z"))
    expect(celdas).toHaveLength(24)
    expect(celdas[0].clave).toBe("2026-10-12 08:00")
    expect(celdas[1].clave).toBe("2026-10-13 08:00")
    // Última celda: sábado, bloque de las 16:00.
    expect(celdas[23].clave).toBe("2026-10-17 16:00")
    // todas laborables (Lun–Sáb) y futuras o pasadas según la semana pedida
    expect(celdas.every((c) => c.laborable)).toBe(true)
  })

  it('inicioSemana es idempotente: cualquier fecha de la semana da el mismo lunes', () => {
    const lunes = lunesActual()
    expect(lunes.getUTCDay()).toBe(1)
    // Una fecha a mitad de semana y el propio lunes generan las mismas celdas.
    expect(celdasSinCitas(new Date(lunes.getTime() + 3 * 86_400_000))[0].clave).toBe(
      celdasSinCitas(lunes)[0].clave,
    )
    expect(celdasSinCitas(lunes)[0].clave).toBe(`${lunes.toISOString().slice(0, 10)} 08:00`)
  })

  it("no pinta nada interactivo en los días no laborables (domingo)", () => {
    const semana = new Date("2026-10-12T00:00:00.000Z")
    const domingo = { dow: 0, label: "DOM" }
    render(
      <GrillaBloques
        titulo="Semana"
        celdas={celdasSinCitas(semana)}
        dias={[...DIAS_CORTOS, domingo]}
        renderCelda={(celda) => <span data-testid="celda">{celda.clave}</span>}
      />,
    )
    // 7 columnas x 4 bloques, pero el domingo siempre queda fuera de las celdas.
    expect(screen.getAllByTestId("celda")).toHaveLength(24)
    expect(screen.getByText("DOM")).toBeInTheDocument()
  })

  it("el contenido de cada celda lo define la página (children pattern)", () => {
    const semana = new Date("2026-10-12T00:00:00.000Z")
    const datos = new Map([
      ["2026-10-14 10:00", { estado: "aceptada" as const, citas: [] }],
    ])
    render(
      <GrillaBloques
        titulo="Semana"
        celdas={celdasDeSemana(semana, datos)}
        renderCelda={(celda) =>
          celda.estado === "aceptada" ? <span>Cerrado</span> : <span>Libre</span>
        }
      />,
    )
    expect(screen.getByText("Cerrado")).toBeInTheDocument()
    expect(screen.getAllByText("Libre")).toHaveLength(23)
  })

  it("dispara onAnterior/onSiguiente/onHoy", async () => {
    const user = userEvent.setup()
    const onAnterior = vi.fn()
    const onSiguiente = vi.fn()
    const onHoy = vi.fn()
    render(
      <GrillaBloques
        titulo="Semana"
        celdas={celdasSinCitas(lunesActual())}
        onAnterior={onAnterior}
        onSiguiente={onSiguiente}
        onHoy={onHoy}
        renderCelda={(celda) => <span>{celda.clave}</span>}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Semana anterior" }))
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }))
    await user.click(screen.getByRole("button", { name: "Hoy" }))
    expect(onAnterior).toHaveBeenCalledTimes(1)
    expect(onSiguiente).toHaveBeenCalledTimes(1)
    expect(onHoy).toHaveBeenCalledTimes(1)
  })

  it("la hora de cada fila es la del bloque de la retícula", () => {
    render(
      <GrillaBloques
        titulo="Semana"
        celdas={celdasSinCitas(lunesActual())}
        renderCelda={(celda) => (
          <span>{celda.fecha.toISOString().slice(11, 16)}</span>
        )}
      />,
    )
    // La hora del gutter más una celda por día laborable (6) para cada bloque.
    for (const bloque of BLOQUES) {
      expect(screen.getAllByText(bloque.inicio).length).toBeGreaterThanOrEqual(
        DIAS_CORTOS.length,
      )
    }
  })
})
