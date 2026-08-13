import express from 'express'
import cors from 'cors'
import qrcodeTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import pino from 'pino'
import { fileURLToPath } from 'node:url'
import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys'
import { candidatosMexico } from './phone.js'

// Baileys registra internamente ciertos errores de descifrado (p. ej. al
// recibir un mensaje "peer" de sincronización justo después de vincular la
// sesión) pero el error igual escapa como rechazo/excepción no capturada, lo
// que mata el proceso — y con él, todo `npm run dev` vía concurrently. Se
// intercepta a nivel de proceso para solo loguear y seguir corriendo.
process.on('unhandledRejection', (reason) => {
  console.error('[whatsapp] unhandledRejection (ignorado):', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[whatsapp] uncaughtException (ignorado):', err)
})

const PORT = process.env.WHATSAPP_SERVICE_PORT || 3900
// fileURLToPath (en vez de leer `.pathname` a mano) da la ruta correcta en
// Windows; `.pathname` deja un "/C:/..." que Windows reinterpreta y duplica
// la letra de unidad (p.ej. "C:\C:\Users\...").
const AUTH_DIR = fileURLToPath(new URL('../auth', import.meta.url))
const logger = pino({ level: 'warn' })

let sock = null
let currentQrDataUrl = null
let connected = false
let connecting = false

async function iniciarSesion() {
  if (connecting) return
  connecting = true
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['Deportivo Morelos', 'Chrome', '1.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 })
      console.log('\n=== Escanea este código QR desde WhatsApp (Dispositivos vinculados) ===\n')
      qrcodeTerminal.generate(qr, { small: true })
      console.log('\nSi cambia, se vuelve a generar automáticamente hasta vincular.\n')
    }

    if (connection === 'open') {
      connected = true
      currentQrDataUrl = null
      connecting = false
      console.log('[whatsapp] Sesión vinculada y activa.')
    }

    if (connection === 'close') {
      connected = false
      connecting = false
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      console.log(`[whatsapp] Conexión cerrada (código ${statusCode ?? 'desconocido'}). Reintentando…`)

      // Nunca se detiene: si fue logout real, se limpia la sesión para pedir un QR
      // nuevo; en cualquier otro caso (red, reinicio de WhatsApp, etc.) se
      // reconecta con las mismas credenciales guardadas.
      if (loggedOut) {
        const fs = await import('node:fs/promises')
        await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {})
      }
      setTimeout(iniciarSesion, 2000)
    }
  })
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))

app.get('/status', (_req, res) => {
  res.json({ connected, qr: connected ? null : currentQrDataUrl })
})

async function resolverJid(telefono) {
  if (!connected || !sock) return null
  const candidatos = candidatosMexico(telefono)
  if (candidatos.length === 0) return null
  const resultados = await sock.onWhatsApp(...candidatos)
  const match = resultados?.find((r) => r?.exists)
  return match ? match.jid : null
}

app.get('/check/:telefono', async (req, res) => {
  if (!connected) return res.status(503).json({ error: 'whatsapp_no_conectado' })
  try {
    const jid = await resolverJid(req.params.telefono)
    res.json({ registered: Boolean(jid), jid: jid ?? null })
  } catch (err) {
    res.status(500).json({ error: 'check_failed', detail: String(err?.message || err) })
  }
})

async function enviarAJid(jid, buffer, textoCaption) {
  // Con un número al que nunca se le ha escrito, la sesión de cifrado
  // (Signal) todavía no existe; suscribirse a su presencia fuerza a
  // WhatsApp a intercambiarla antes de mandar la imagen, evitando que el
  // primer envío "en frío" falle o se quede sin efecto.
  try {
    await sock.presenceSubscribe(jid)
    await new Promise((resolve) => setTimeout(resolve, 300))
  } catch {
    // No es crítico: si falla, igual se intenta el envío.
  }

  try {
    await sock.sendMessage(jid, { image: buffer, caption: textoCaption })
  } catch {
    // Reintento para primer contacto: un texto suele terminar de
    // establecer la sesión donde la imagen sola falló; si el texto
    // funciona, se manda la imagen después.
    await sock.sendMessage(jid, { text: textoCaption })
    await sock.sendMessage(jid, { image: buffer })
  }
}

app.post('/send-qr', async (req, res) => {
  if (!connected || !sock) return res.status(503).json({ error: 'whatsapp_no_conectado' })
  const { telefono, imagenBase64, caption } = req.body || {}
  if (!telefono || !imagenBase64) {
    return res.status(400).json({ error: 'faltan_parametros' })
  }
  try {
    // candidatosMexico ya devuelve primero el formato "52" y después "521";
    // se intenta enviar con cada uno en ese orden hasta que uno funcione.
    const candidatos = candidatosMexico(telefono)
    if (candidatos.length === 0) {
      return res.status(400).json({ error: 'telefono_invalido' })
    }

    const base64 = imagenBase64.includes(',') ? imagenBase64.split(',')[1] : imagenBase64
    const buffer = Buffer.from(base64, 'base64')
    const textoCaption = caption || 'Aquí está tu código QR de acceso al gimnasio.'

    let ultimoError = null
    for (const candidato of candidatos) {
      const jid = `${candidato}@s.whatsapp.net`
      try {
        await enviarAJid(jid, buffer, textoCaption)
        return res.json({ success: true, jid })
      } catch (err) {
        ultimoError = err
        console.error(`[whatsapp] Falló el envío a ${jid}, probando siguiente candidato:`, err?.message || err)
      }
    }

    res.status(500).json({ error: 'send_failed', detail: String(ultimoError?.message || ultimoError) })
  } catch (err) {
    res.status(500).json({ error: 'send_failed', detail: String(err?.message || err) })
  }
})

app.delete('/session', async (_req, res) => {
  const fs = await import('node:fs/promises')
  await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {})
  connected = false
  currentQrDataUrl = null
  try {
    sock?.end?.(undefined)
  } catch {
    // ignorar
  }
  setTimeout(iniciarSesion, 500)
  res.json({ success: true })
})

// Se enlaza el puerto ANTES de iniciar la sesión de WhatsApp: si algo más
// (otra instancia lanzada por Tauri, por `npm run dev`, etc.) ya lo tiene
// ocupado, esta instancia se retira en silencio en vez de arrancar una
// segunda sesión de Baileys en paralelo.
const server = app.listen(PORT)

server.on('listening', () => {
  console.log(`[whatsapp] Servicio escuchando en http://localhost:${PORT}`)
  iniciarSesion().catch((err) => {
    console.error('[whatsapp] Error iniciando sesión, reintentando en 5s:', err)
    connecting = false
    setTimeout(iniciarSesion, 5000)
  })
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(
      `[whatsapp] Ya hay una instancia de whatsapp-service corriendo en el puerto ${PORT}. ` +
        'No se inicia una sesión duplicada; esta copia se cierra.',
    )
    process.exit(0)
  }
  console.error('[whatsapp] Error al iniciar el servidor:', err)
  process.exit(1)
})
