// Copy de las 8 secciones de la landing. Separado de los componentes para que
// el texto se pueda editar sin tocar JSX.

export const HERO = {
  tituloLineas: ["Muebles.", "Diseño.", "Luz."],
  // La segunda línea lleva gradiente.
  tituloGradienteDesdeLinea: 1,
  cta: "Agendar cita",
  ctaSecundaria: "Ver portafolio",
} as const

// Presentación formal del taller: qué hace Tonfort y qué piezas fabrica.
// Copy institucional y sintético, sin adjetivos de más.
export const NOSOTROS = {
  eyebrow: "Nosotros",
  tituloLineas: ["Diseñamos y fabricamos", "mobiliario a medida."],
  tituloGradienteDesdeLinea: 1,
  bajada:
    "Tonfort es una carpintería de diseño. Tomamos las medidas de tu espacio, diseñamos cada pieza en 3D, la fabricamos en nuestro taller y la instalamos con su iluminación integrada.",
  puntos: [
    { titulo: "Cocinas", texto: "Islas, encimeras y almacenamiento a medida." },
    { titulo: "Closets", texto: "Armarios y vestidores con luz interior." },
    { titulo: "Muebles de TV", texto: "Muros de medios y libreros integrados." },
    { titulo: "Puertas y espacios", texto: "Puertas de paso y ambientes completos." },
  ],
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

// Texto de apoyo de la sección de presentación de diseños. Va en el bloque, no
// en el carrusel: el carrusel solo dibuja visores.
export const VISORES = {
  eyebrow: "Propuestas",
  titulo: "Mira cómo se presentan los diseños.",
  descripcion:
    "Cada propuesta se recorre en video: mueve el cursor y explora los detalles.",
} as const

export interface PersonaEquipo {
  nombre: string
  rol: string
  foto: string
}

export const EQUIPO = {
  eyebrow: "Equipo",
  titulo: "Tres roles",
  personas: [
    {
      nombre: "Santiago Bustos",
      rol: "Carpintero",
      foto: "/equipo/santiago.jpg",
    },
    {
      nombre: "Natalia Bustos",
      rol: "Asesora",
      foto: "/equipo/natalia.jpg",
    },
    {
      nombre: "Esteban Bustos",
      rol: "Diseñador",
      foto: "/equipo/esteban.jpg",
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