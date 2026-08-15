// Datos de contacto centralizados de Tonfort
// WhatsApp en formato internacional sin símbolos (Colombia +57)
export const WHATSAPP_NUMBER = "573123791632"

export const WHATSAPP_MESSAGE =
  "Hola Tonfort, me gustaría conversar sobre un proyecto para mi espacio."

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`

export const INSTAGRAM_HANDLE = "tonfort.muebles"
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`

export const EMAIL = "hola@tonfort.com"
export const EMAIL_URL = `mailto:${EMAIL}`
