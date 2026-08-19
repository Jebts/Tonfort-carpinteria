import { redirect } from "next/navigation"

// El panel no tiene "inicio" propio: redirige a la primera sección.
export default function StaffIndexPage() {
  redirect("/staff/clientes")
}
