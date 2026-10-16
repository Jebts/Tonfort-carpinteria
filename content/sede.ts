import { SEDE, TELEFONO_URL, EMAIL_URL } from "@/lib/contact"

// Contenido editorial de la página /sede.
// Regla de copy: máximo 8 palabras por punto, 14 por subtítulo.
// Ninguna oración supera los 160 caracteres.

export const SEDE_HERO = {
  src: "/sede/hero-sede.png",
  alt: "Mesa de trabajo de la sede con laptop abierta, impresora, silla y una cortina azul al fondo",
  tituloLineas: ["Un taller", "donde la madera cobra forma."],
} as const

export const SEDE_VIDEO = {
  src: "/sede/video-taller.mp4",
  poster: "/sede/video-poster.png",
} as const

export interface FotoSede {
  src: string
  alt: string
  layout: "ancho" | "cuadro" | "cuadrado"
}

export const SEDE_FOTOS: FotoSede[] = [
  {
    src: "/sede/sede-mostrador.jpg",
    alt: "Mostrador de madera clara con taburete de tronco y lámparas colgantes",
    layout: "ancho",
  },
  {
    src: "/sede/sede-sofa.jpg",
    alt: "Sofá de la sala de espera junto a la cortina azul con luz de la tarde",
    layout: "cuadro",
  },
  {
    src: "/sede/sede-escritorio.jpg",
    alt: "Escritorio con laptop, teclado mecánico e impresora junto a la cortina azul",
    layout: "cuadro",
  },
  {
    src: "/sede/sede-equipo.jpg",
    alt: "Persona del equipo de pie junto a los paneles azules de la sede",
    layout: "cuadro",
  },
  {
    src: "/sede/sede-mostrador-espejo.jpg",
    alt: "Mostrador de madera y mármol con espejo retroiluminado",
    layout: "cuadrado",
  },
  {
    src: "/sede/sede-herramientas.jpg",
    alt: "Panel perforado con sierras y taladros ordenados",
    layout: "cuadrado",
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