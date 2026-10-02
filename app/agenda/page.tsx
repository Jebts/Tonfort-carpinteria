import { redirect } from "next/navigation"

// El flujo público es lineal de 2 pasos: modalidad → horario.
export default function AgendaRedirect() {
  redirect("/agenda/modalidad")
}
