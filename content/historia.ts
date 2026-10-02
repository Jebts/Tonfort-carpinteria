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
  titulo: "La luz vuelve a\nencenderse.",
  subtitulo: "Un espacio bien iluminado cambia la manera de habitarlo.",
}

export const BLOQUES_HISTORIA: BloqueHistoria[] = [
  {
    id: "apertura",
    etiqueta: "El origen",
    titulo: "Hace tiempo, en una Bogotá fría y luminosa",
    parrafos: [
      "Todo empezó como EyDiseños, cuando el diseño industrial y la madera se cruzaron por primera vez en nuestras manos.",
      "No buscábamos hacer muebles: queríamos resolver cómo vive la gente su casa. Cada proyecto era una conversación antes que una entrega.",
    ],
    imagen: "/history-workshop-light.png",
    imagenDerecha: false,
  },
  {
    id: "fundadores",
    etiqueta: "Los fundadores",
    titulo: "Un padre, una madre y una familia que creció con el trabajo",
    parrafos: [
      "El padre llevó el diseño industrial y la arquitectura; la madre, el mercadeo, la administración y la logística que mantienen todo en pie.",
      "En medio del trabajo crecieron los hijos, que aprendieron pronto que un espacio bien pensado es, sobre todo, un acto de cuidado.",
    ],
    imagen: "/history-founders.jpg",
    imagenDerecha: true,
  },
  {
    id: "cierre",
    etiqueta: "El viaje",
    titulo: "Los desafíos, el cierre y la decisión de volver a empezar",
    parrafos: [
      "Llegaron los desafíos, el cierre en Bogotá y la decisión de soltar para recommenzar.",
      "Santa Marta —La Perla de América— nos recibió con otro sol, otra luz y la posibilidad de recomenzar desde lo esencial.",
    ],
    imagen: "/history-installation.jpg",
    imagenDerecha: false,
  },
  {
    id: "chispa",
    etiqueta: "El reencuentro",
    titulo: "La chispa vuelve cuando la familia se reencuentra",
    parrafos: [
      "Los hijos retomaron los primeros proyectos con las manos ya grandes y la misma paciencia de siempre.",
      "Lo que parecía un paréntesis se volvió un regreso: la familia se reencontró alrededor del banco de trabajo.",
    ],
    imagen: "/history-family.jpg",
    imagenDerecha: true,
  },
  {
    id: "hoy",
    etiqueta: "Hoy",
    titulo: "tonfort: EyDiseños que reabre, con la familia completa",
    parrafos: [
      "Hoy somos tonfort: sumamos la trayectoria de nuestros padres con el talento de los hijos.",
      "Esta página se escribe con amor, resiliencia y diseño. Gracias por dejarnos acompañar el espacio donde vives.",
    ],
    imagen: "/history-first-build.jpg",
    imagenDerecha: false,
  },
]