const BASE_URL = import.meta.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3900'

export interface WhatsAppStatus {
  connected: boolean
  qr: string | null
  state?: string
  enabled?: boolean
}

/** Ping corto: si el servicio no responde (no está corriendo), se trata como desconectado. */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${BASE_URL}/status`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return { connected: false, qr: null }
    return await res.json()
  } catch {
    return { connected: false, qr: null }
  }
}

export async function checkWhatsAppNumber(telefono: string): Promise<{ registered: boolean; jid: string | null }> {
  console.log(`[whatsapp:front] ${new Date().toISOString()} → GET /check/${telefono}`)
  const res = await fetch(`${BASE_URL}/check/${encodeURIComponent(telefono)}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.log(`[whatsapp:front] ${new Date().toISOString()} ← /check falló (${res.status}):`, body)
    const conocidos = ['whatsapp_no_conectado', 'whatsapp_deshabilitado']
    throw new Error(conocidos.includes(body.error) ? body.error : 'check_failed')
  }
  const body = await res.json()
  console.log(`[whatsapp:front] ${new Date().toISOString()} ← /check ok:`, body)
  return body
}

export async function sendQrByWhatsApp(params: {
  telefono: string
  imagenBase64: string
  caption?: string
}): Promise<{ success: boolean; jid: string }> {
  console.log(`[whatsapp:front] ${new Date().toISOString()} → POST /send-qr para ${params.telefono}`)
  const res = await fetch(`${BASE_URL}/send-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    // Ahora puede reintentar con un segundo formato de número (+52 y luego
    // +521) si el primero falla, así que se da más margen que un solo envío.
    signal: AbortSignal.timeout(45000),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.log(`[whatsapp:front] ${new Date().toISOString()} ← /send-qr falló (${res.status}):`, body)
    throw new Error(body.error || 'send_failed')
  }
  console.log(`[whatsapp:front] ${new Date().toISOString()} ← /send-qr ok:`, body)
  return body
}

export const WHATSAPP_ERROR_LABEL: Record<string, string> = {
  whatsapp_no_conectado: 'El servicio de WhatsApp no está conectado. Vincula la sesión primero.',
  numero_sin_whatsapp: 'Ese número no tiene una cuenta de WhatsApp activa.',
  check_failed: 'No se pudo validar el número. Intenta de nuevo.',
  send_failed: 'No se pudo enviar el QR por WhatsApp. Intenta de nuevo.',
  faltan_parametros: 'Faltan datos para enviar el QR.',
  telefono_invalido: 'El número de teléfono no es válido.',
  whatsapp_deshabilitado: 'El envío por WhatsApp está deshabilitado en este servicio.',
}
