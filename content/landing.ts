// Copy de las 7 secciones de la landing. Separado de los componentes para que
// el texto se pueda editar sin tocar JSX.

export const HERO = {
  eyebrow: "Carpintería · Santa Marta",
  tituloLineas: ["Muebles.", "Diseño.", "Luz."],
  // La segunda línea lleva gradiente.
  tituloGradienteDesdeLinea: 1,
  bajada: "Diseñamos y fabricamos el espacio donde habitas.",
  cta: "Agendar cita",
  ctaSecundaria: "Ver portafolio",
  microcopy: "Respuesta en 24 h. Sin compromiso.",
} as const

export const LUZ = {
  eyebrow: "Identidad",
  tituloLineas: ["La luz no decora.", "Define."],
  tituloGradienteDesdeLinea: 1,
  bajada:
    "Diseñamos la luz antes que el mueble. Por eso cada pieza llega con su propia temperatura.",
  puntos: [
    { titulo: "Luz integrada", texto: "Perfiles ocultos dentro del mueble." },
    { titulo: "Cálida y precisa", texto: "Una temperatura por cada uso." },
    { titulo: "Sin cables a la vista", texto: "Alimentación escondida en la madera." },
  ],
} as const

export const PROYECTOS = {
  eyebrow: "Trabajo reciente",
  titulo: "Lo último que salió del taller.",
  cta: "Ver todo el portafolio",
} as const

// Fotos de respaldo cuando la BD no devuelve 3 proyectos publicados.
export const PROYECTOS_FALLBACK: { titulo: string; image: string }[] = [
  { titulo: "Closet a medida", image: "/tonfort-closet-render.png" },
  { titulo: "Mueble de TV", image: "/tonfort-hero-wall.png" },
  { titulo: "Mesa de comedor", image: "/tonfort-hero-plant.png" },
]

export interface PersonaEquipo {
  nombre: string
  rol: string
  foto: string
  texto: string
}

export const EQUIPO = {
  eyebrow: "Equipo",
  titulo: "Tres roles, un mismo estándar.",
  personas: [
    {
      nombre: "Santiago Bustos",
      rol: "Carpintería",
      foto: "/equipo/santiago.jpg",
      texto: "Construye las piezas y lee la madera.",
    },
    {
      nombre: "Natalia Bustos",
      rol: "Diseño",
      foto: "/equipo/natalia.jpg",
      texto: "Dibuja el espacio y mide cada detalle.",
    },
    {
      nombre: "Esteban Bustos",
      rol: "Asesoría",
      foto: "/equipo/esteban.jpg",
      texto: "Escucha el proyecto y acompaña la obra.",
    },
  ] satisfies PersonaEquipo[],
} as const

export const AGENDA_CTA = {
  eyebrow: "Siguiente paso",
  titulo: "¿Lo hacemos?",
  bajada: "Una primera conversación, sin costo y sin compromiso.",
  cta: "Agendar cita",
  nota: "Virtual gratis o visita a domicilio.",
} as const