import { SEDE, TELEFONO_URL, EMAIL_URL } from "@/lib/contact"

// Contenido editorial de la página /sede.
// Regla de copy: máximo 8 palabras por punto, 14 por subtítulo.
// Ninguna oración supera los 160 caracteres.

export const SEDE_HERO = {
  eyebrow: "La sede",
  tituloLineas: ["Un taller", "en la costa."],
  subtitulo: "Donde cada mueble se diseña, se mide y se arma a mano.",
} as const

export const SEDE_VIDEO = {
  src: "/sede/video-taller.mp4",
  poster: "/sede/poster-taller.png",
} as const

export interface FotoSede {
  src: string
  alt: string
  layout: "ancho" | "cuadro"
}

export const SEDE_FOTOS: FotoSede[] = [
  {
    src: "/sede/foto-1.jpg",
    alt: "Banco de trabajo con herramientas y planos de carpintería",
    layout: "ancho",
  },
  {
    src: "/sede/foto-2.jpg",
    alt: "Muestras de madera y herrajes ordenados sobre una mesa",
    layout: "cuadro",
  },
  {
    src: "/sede/foto-3.jpg",
    alt: "Taller con luz natural y piezas en proceso",
    layout: "cuadro",
  },
]

export interface PuntoSede {
  titulo: string
  texto: string
}

export const SEDE_PUNTOS: PuntoSede[] = [
  {
    titulo: "Diseño",
    texto: "Primero dibujamos. Después fabricamos.",
  },
  {
    titulo: "Madera",
    texto: "Elegimos la lámina antes de cortar.",
  },
  {
    titulo: "Luz",
    texto: "Cada pieza llega con su temperatura definida.",
  },
  {
    titulo: "Entrega",
    texto: "Instalamos en tu casa y ajustamos en el sitio.",
  },
]

export interface DatoSede {
  label: string
  value: string
  href?: string
}

export const SEDE_DATOS: DatoSede[] = [
  { label: "Dirección", value: SEDE.direccion },
  { label: "Teléfono", value: SEDE.telefono, href: TELEFONO_URL },
  { label: "WhatsApp", value: "Escríbenos", href: SEDE.whatsapp },
  { label: "Horario", value: SEDE.horario },
  { label: "Correo", value: SEDE.email, href: EMAIL_URL },
]