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
