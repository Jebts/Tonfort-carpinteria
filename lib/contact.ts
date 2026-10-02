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
// Los marcadores `<...>` son datos pendientes de completar. Mientras existan,
// `/sede` renderiza el mapa con la URL por defecto y avisa en desarrollo.

export const TELEFONO = process.env.NEXT_PUBLIC_TELEFONO ?? "<TELÉFONO>"
export const TELEFONO_URL = `tel:${TELEFONO.replace(/[^\d+]/g, "")}`

export const MAPS_PLACEHOLDER = "https://www.google.com/maps/embed?pb=<PB>"

export const SEDE = {
  nombre: "Tonfort Santa Marta",
  direccion: "<DIRECCIÓN REAL — completar>",
  barrio: "Santa Marta, Magdalena",
  telefono: TELEFONO,
  telefonoUrl: TELEFONO_URL,
  email: EMAIL,
  whatsapp: WHATSAPP_URL,
  instagram: INSTAGRAM_URL,
  horario: "Lunes a sábado, 8:00 a.m. – 6:00 p.m.",
  mapsEmbedUrl: MAPS_PLACEHOLDER,
  mapsUrl: "https://maps.google.com/?q=<DIRECCIÓN>",
  coordenadas: { lat: 0, lng: 0 },
} as const

// `true` mientras queden marcadores `<...>` por reemplazar.
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
