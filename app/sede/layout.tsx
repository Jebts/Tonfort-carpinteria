import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sede · Tonfort Santa Marta",
  description:
    "El taller de Tonfort en Santa Marta: dirección, horario, cómo llegar y qué pasa dentro. Diseñamos y fabricamos muebles a medida con luz integrada.",
  alternates: { canonical: "/sede" },
  openGraph: {
    title: "Sede · Tonfort Santa Marta",
    description: "El taller de Tonfort en Santa Marta. Diseño y fabricación de muebles a medida.",
    images: [{ url: "/sede/hero-sede.png", width: 1920, height: 1080, alt: "La sede de Tonfort en Santa Marta" }],
  },
}

export default function SedeLayout({ children }: { children: React.ReactNode }) {
  // La página es oscura por diseño. Se fuerza el tema en el contenido para que
  // los tokens de la navbar sean los oscuros sin tocar el tema global.
  return <div className="dark bg-black">{children}</div>
}
