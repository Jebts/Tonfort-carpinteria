// Datos de contacto centralizados de Tonfort
// WhatsApp en formato internacional sin símbolos (Colombia +57)
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "3127916632"

export const WHATSAPP_MESSAGE =
  "Hola Tonfort, me gustaría conversar sobre un proyecto para mi espacio."

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`

export const INSTAGRAM_HANDLE = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "tonfort.muebles"
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`

export const EMAIL = process.env.NEXT_PUBLIC_EMAIL ?? "hola@tonfort.com"
export const EMAIL_URL = `mailto:${EMAIL}`

// ==========================================
// Sede física
// ==========================================
// Dirección real confirmada por el usuario: Galicia, Santa Marta.

export const TELEFONO = process.env.NEXT_PUBLIC_TELEFONO ?? "3127916632"
export const TELEFONO_URL = `tel:${TELEFONO.replace(/[^\d+]/g, "")}`

// El embed sale del botón "Insertar mapa" de la ficha de Google Business Profile
// de Tonfort. El `pb` es opaco: codifica centro, zoom y el Place ID
// `0x8ef4f561b920be33:0xc65ae35ceb171e9` (escapado como `%3A`), que es lo que
// hace que el mapa pinte la ficha de tonfort en vez de resolver un local
// vecino. No conviene editarlo a mano: se vuelve a copiar del panel de Google.
//
// Hubo una temporada en OpenStreetMap porque la ficha todavía no existía y el
// embed de Google resolvía un local vecino con un Place ID retirado
// (`PLACES_GET_PLACE: NOT_FOUND`, 404 en `GetPlace`). Con la ficha creada ese
// error se acaba y se vuelve al mapa de Google.
const MAPA_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3913.283304939856!2d-74.18320941397484!3d11.24055752195373!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef4f561b920be33%3A0xc65ae35ceb171e9!2sTonfort!5e0!3m2!1ses-419!2sco!4v1791774231100!5m2!1ses-419!2sco"

// Enlace corto de la ficha (el "Compartir" de Google), para el botón "Cómo
// llegar": abre la app de Mapas con rutas a la sede.
const MAPA_URL = "https://maps.app.goo.gl/LdPiH9VeyGJf4bieA"

// Coordenadas de la ficha, las mismas que codifica el `pb` de arriba. La UI no
// las usa para pintar el mapa, pero `SEDE_PENDIENTE_DATOS` las lee para
// detectar marcadores sin confirmar.
const SEDE_LAT = 11.24055752
const SEDE_LNG = -74.18320941

export const SEDE = {
  nombre: "Tonfort Santa Marta",
  direccion: "Cra 33 Cl 14-31, Galicia, Santa Marta",
  barrio: "Galicia, Santa Marta, Magdalena",
  telefono: TELEFONO,
  telefonoUrl: TELEFONO_URL,
  email: EMAIL,
  whatsapp: WHATSAPP_URL,
  instagram: INSTAGRAM_URL,
  horario: "Lunes a sábado, 8:00 a.m. – 6:00 p.m.",
  mapsEmbedUrl: MAPA_EMBED,
  mapsUrl: MAPA_URL,
  coordenadas: { lat: SEDE_LAT, lng: SEDE_LNG },
} as const

// `true` mientras queden datos sin confirmar.
export const SEDE_PENDIENTE_DATOS = ((): boolean => {
  const pendientes = [
    SEDE.direccion,
    SEDE.telefono,
    SEDE.mapsEmbedUrl,
    SEDE.mapsUrl,
    String(SEDE.coordenadas.lat),
    String(SEDE.coordenadas.lng),
  ]
  return pendientes.some((v) => v.includes("<") || v.includes(">") || v === "0")
})()
