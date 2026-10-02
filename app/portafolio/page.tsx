import { redirect } from "next/navigation"

// El portafolio se publica por sede. `/portafolio` es solo un alias de la
// sede principal.
export default function PortafolioRedirect() {
  redirect("/portafolio/santa-marta")
}
