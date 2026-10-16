import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Calendario, type BloqueSemana } from "@/components/tonfort/agenda/calendario"
import { slotKey } from "@/lib/agenda"

// Lunes a domingo de la semana en curso (en UTC, como genera `lib/agenda`).
function isoDelDia(dow: number, hora: number): string {
  const hoy = new Date()
  const lunes = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - ((hoy.getUTCDay() + 6) % 7)),
  )
  const d = new Date(lunes)
  d.setUTCDate(d.getUTCDate() + (dow - 1))
  d.setUTCHours(hora, 0, 0, 0)
  return d.toISOString()
}

// `desde` del componente: lunes 00:00 UTC. `hasta` = +7 días (domingo siguiente).
function rangoSemanaVisible(): { desde: string; hasta: string } {
  const lunes = new Date(isoDelDia(1, 0))
  const domingo = new Date(lunes)
  domingo.setUTCDate(domingo.getUTCDate() + 7)
  return { desde: lunes.toISOString(), hasta: domingo.toISOString() }
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  // Por defecto la API responde lo mismo que ya venía del servidor.
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ slots: [] }),
  } as unknown as Response)
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function celda(texto: string): HTMLButtonElement {
  const boton = screen.getByRole("button", { name: new RegExp(texto) })
  return boton as HTMLButtonElement
}

describe("Calendario", () => {
  const juevesLibre = isoDelDia(4, 8) // Jue 08:00, siempre futuro esta semana

  it("pide al API la semana que se está mostrando, no la anterior", async () => {
    // El rango pedido debe cubrir la semana visible: si pide la anterior, la
    // respuesta no trae slots y la grilla los muestra todos libres.
    const { desde, hasta } = rangoSemanaVisible()
    render(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={[{ fecha_hora: juevesLibre, estado: "vacio" }]}
        seleccionado={null}
        onSelect={() => {}}
      />,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const url = fetchMock.mock.calls[0][0] as string
    const params = new URL(url, "http://localhost").searchParams
    expect(params.get("desde")).toBe(desde)
    expect(params.get("hasta")).toBe(hasta)
  })

  it("una cita en espera NO bloquea el bloque: solo `aceptada` lo ocupa", async () => {
    // El cupo lo decide el backend (`validarSlotLibre` solo mira `aceptada`):
    // mientras la solicitud siga `en_espera` el público puede pedir el mismo
    // hueco. La grilla debe mostrarlo disponible con su contador.
    const inicial: BloqueSemana[] = [
      { fecha_hora: isoDelDia(3, 8), estado: "aceptada" },
      { fecha_hora: isoDelDia(5, 14), estado: "en_espera", enEspera: 2, canceladas: 1 },
      { fecha_hora: isoDelDia(4, 8), estado: "vacio" },
    ]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ slots: inicial }),
    } as unknown as Response)

    render(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={inicial}
        seleccionado={null}
        onSelect={() => {}}
      />,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // Mié 08:00 está confirmada: deshabilitada.
    expect(celda("Mié \\d+, 08:00 – 10:00")).toBeDisabled()
    // Vie 14:00 solo tiene solicitudes en espera: se puede pedir igual.
    expect(celda("Vie \\d+, 14:00 – 16:00")).toBeEnabled()
    // Un bloque libre de la misma semana sigue disponible.
    expect(celda("Jue \\d+, 08:00 – 10:00")).toBeEnabled()
  })

  it("muestra un círculo con el contador de en espera y otro de canceladas", async () => {
    const inicial: BloqueSemana[] = [
      { fecha_hora: isoDelDia(4, 10), estado: "en_espera", enEspera: 3, canceladas: 2 },
    ]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ slots: inicial }),
    } as unknown as Response)

    render(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={inicial}
        seleccionado={null}
        onSelect={() => {}}
      />,
    )

    const celdaJueves = celda("Jue \\d+, 10:00 – 12:00")
    // Círculo amarillo con las en espera y círculo gris con las canceladas.
    expect(within(celdaJueves).getByText("3")).toBeInTheDocument()
    expect(within(celdaJueves).getByText("2")).toBeInTheDocument()
    // El contador viaja también en el nombre accesible.
    expect(celdaJueves).toHaveAccessibleName(/disponible, 3 en espera, 2 canceladas/)
  })

  it("la selección del usuario queda marcada y persiste al recargar la grilla", async () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={[{ fecha_hora: juevesLibre, estado: "vacio" }]}
        seleccionado={null}
        onSelect={onSelect}
      />,
    )

    const boton = celda(`Jue \\d+, 08:00 – 10:00`)
    expect(boton).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(boton)

    // La clave viaja en formato `slotKey` (UTC), no ISO.
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [fechaIso] = onSelect.mock.calls[0]
    expect(slotKey(new Date(fechaIso as string))).toBe(slotKey(new Date(juevesLibre)))

    // El padre re-renderiza con la clave: la celda pasa a `aria-pressed=true`.
    const clave = slotKey(new Date(juevesLibre))
    rerender(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={[{ fecha_hora: juevesLibre, estado: "vacio" }]}
        seleccionado={clave}
        onSelect={onSelect}
      />,
    )
    const marcada = celda(`Jue \\d+, 08:00 – 10:00`)
    expect(marcada).toHaveAttribute("aria-pressed", "true")
    // La selección se pinta con el token `royal` (#2856c7, igual en claro y
    // oscuro): antes era el hex literal, la grilla compartida usa tokens.
    expect(marcada).toHaveClass("bg-royal")
  })

  it("el fetch del cliente actualiza la ocupación sin apagarla", async () => {
    // El API devuelve un bloque ocupado dentro de la semana visible.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        slots: [
          { fecha_hora: isoDelDia(2, 10), estado: "aceptada", citas: [{ id: "c1", estado: "aceptada", esMio: false }] },
        ],
      }),
    } as unknown as Response)

    render(
      <Calendario
        modalidadId="virtual"
        modalidadSlug="virtual"
        inicial={[{ fecha_hora: juevesLibre, estado: "vacio" }]}
        seleccionado={null}
        onSelect={() => {}}
      />,
    )

    await waitFor(() => expect(celda("Mar \\d+, 10:00 – 12:00")).toBeDisabled())
  })
})
