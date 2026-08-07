import QRCode from 'qrcode'
import { encryptText, decryptText } from './crypto'
import infoQrTemplate from '../InfoQR.png'

const QR_PREFIX = 'gymtech-qr-v1:'

/** Recuadro blanco del "Pase de acceso" (InfoQR.png), como fracción del tamaño de la plantilla. */
const QR_BOX = {
  xRatio: 1195 / 4096,
  yRatio: 1552 / 6144,
  widthRatio: 1708 / 4096,
  heightRatio: 1617 / 6144,
}

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}

/** Ancho máximo (px) del pase generado: mantiene el archivo ligero para WhatsApp y descarga. */
const FLYER_MAX_WIDTH = 1000

/** Genera el "Pase de acceso" (InfoQR.png) con el QR centrado en el recuadro blanco, listo para descargar o enviar. */
export async function buildQrFlyerDataUrl(token: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 500, color: { dark: '#0a0a0d', light: '#ffffff' } })
  const [template, qr] = await Promise.all([loadImage(infoQrTemplate), loadImage(qrDataUrl)])

  const scale = Math.min(1, FLYER_MAX_WIDTH / template.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(template.width * scale)
  canvas.height = Math.round(template.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')

  ctx.drawImage(template, 0, 0, canvas.width, canvas.height)

  const boxX = QR_BOX.xRatio * canvas.width
  const boxY = QR_BOX.yRatio * canvas.height
  const boxWidth = QR_BOX.widthRatio * canvas.width
  const boxHeight = QR_BOX.heightRatio * canvas.height

  const qrSize = Math.min(boxWidth, boxHeight) * 0.92
  const qrX = boxX + (boxWidth - qrSize) / 2
  const qrY = boxY + (boxHeight - qrSize) / 2

  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

  return canvas.toDataURL('image/png')
}
