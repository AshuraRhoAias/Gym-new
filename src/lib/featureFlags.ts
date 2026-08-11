/**
 * Apaga por completo la sección de WhatsApp (nav + ruta /whats) sin tocar
 * el servicio. Útil para instalaciones donde no se usa envío de QR por WhatsApp.
 * Se activa poniendo VITE_ENABLE_WHATSAPP=false en el .env.
 */
export const WHATSAPP_ENABLED = import.meta.env.VITE_ENABLE_WHATSAPP !== 'false'
