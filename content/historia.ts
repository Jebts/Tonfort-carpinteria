// Contenido editable de la página /historia.
// Copy cálido y familiar (tonfort = EyDiseños reabierto). Reescrito a partir del boceto.

export interface BloqueHistoria {
  id: string
  etiqueta: string
  titulo: string
  parrafos: string[]
  imagen: string
  // Alineación de la imagen respecto al texto en desktop.
  imagenDerecha?: boolean
}

export const HISTORIA_HERO = {
  etiqueta: "Nuestra historia",
  titulo: "Doce años después, la luz vuelve a encenderse.",
  subtitulo:
    "tonfort nace de EyDiseños: una familia, un taller y la convicción de que un espacio bien iluminado cambia la manera de habitarlo.",
}

export const BLOQUES_HISTORIA: BloqueHistoria[] = [
  {
    id: "apertura",
    etiqueta: "El origen",
    titulo: "Doce años atrás, en Bogotá",
    parrafos: [
      "Todo empezó como EyDiseños, en una Bogotá fría y luminosa, cuando el diseño industrial y la madera se cruzaron por primera vez en nuestras manos.",
      "No buscábamos hacer muebles: queríamos resolver cómo vive la gente su casa. Cada proyecto era una conversación antes que una entrega.",
    ],
    imagen: "/images/placeholder.svg",
    imagenDerecha: false,
  },
  {
    id: "fundadores",
    etiqueta: "Los fundadores",
    titulo: "Edwin, Yecenia y la familia que creció entre proyectos",
    parrafos: [
      "Edwin Bustos llevó el diseño industrial y la arquitectura; Yecenia Tamayo, el mercadeo, la administración y la logística que mantienen todo en pie.",
      "En medio del trabajo creció la familia: Santiago, Natalia y Esteban aprendieron pronto que un espacio bien pensado es, sobre todo, un acto de cuidado.",
    ],
    imagen: "/images/placeholder.svg",
    imagenDerecha: true,
  },
  {
    id: "cierre",
    etiqueta: "El viaje",
    titulo: "El cierre en la capital y el reinicio en Santa Marta",
    parrafos: [
      "Llegaron los desafíos, el cierre en Bogotá y la decisión de soltar para volver a empezar.",
      "Santa Marta —La Perla de América— nos recibió con otro sol, otra luz y la posibilidad de recomenzar desde lo esencial.",
    ],
    imagen: "/images/placeholder.svg",
    imagenDerecha: false,
  },
  {
    id: "chispa",
    etiqueta: "El reencuentro",
    titulo: "La chispa vuelve cuando la familia se reencuentra",
    parrafos: [
      "Santiago y Esteban retomaron los primeros proyectos con las manos ya grandes y la misma paciencia de always.",
      "Lo que parecía un paréntesis se volvió un regreso: la familia se reencontró alrededor del banco de trabajo.",
    ],
    imagen: "/images/placeholder.svg",
    imagenDerecha: true,
  },
  {
    id: "hoy",
    etiqueta: "Hoy",
    titulo: "tonfort: EyDiseños que reabre, con la familia completa",
    parrafos: [
      "Hoy somos tonfort: sumamos la trayectoria de los fundadores con el talento de Santiago (24), Natalia (20) y Esteban (17).",
      "Esta página se escribe con amor, resiliencia y diseño. Gracias por dejarnos acompañar el espacio donde vives.",
    ],
    imagen: "/images/placeholder.svg",
    imagenDerecha: false,
  },
]
