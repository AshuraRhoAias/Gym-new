import QRCode from 'qrcode'
import { encryptText, decryptText } from './crypto'

const QR_PREFIX = 'gymtech-qr-v1:'

/** Genera el token cifrado que se codifica en el QR a partir del id del registro. */
export async function buildQrToken(registroId: string): Promise<string> {
  const cipher = await encryptText(registroId)
  return QR_PREFIX + cipher
}

/** Extrae y descifra el id de registro de un token leído desde un QR escaneado. */
export async function readQrToken(token: string): Promise<string | null> {
  if (!token.startsWith(QR_PREFIX)) return null
  const cipher = token.slice(QR_PREFIX.length)
  const plaintext = await decryptText(cipher)
  return plaintext || null
}

export async function qrToDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { margin: 1, width: 240, color: { dark: '#0a0a0d', light: '#ffffff' } })
}
