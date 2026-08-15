// 08 — Carga sobre el servicio local de WhatsApp (whatsapp-service).
//
// whatsapp-service es un único proceso Node/Express que además mantiene
// viva una sesión de Baileys (WhatsApp Web) — un solo hilo de event loop
// para todo. Esta prueba golpea GET /status y GET /check/:telefono con
// concurrencia para ver si el servidor HTTP se satura o si compite mal con
// el socket de WhatsApp.
//
// ⚠️ A PROPÓSITO no incluye POST /send-qr: eso enviaría mensajes reales de
// WhatsApp y puede hacer que el número quede baneado por patrón de uso
// automatizado. Nunca hagas load-testing de /send-qr contra un número real.
import { runConcurrent, printReport, envInt } from '../lib/stats.mjs'
import '../lib/env.mjs'

const BASE_URL = process.env.WHATSAPP_SERVICE_URL || process.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3900'
const CONCURRENCY = envInt('PERF_CONCURRENCY', 30)
const REQUESTS = envInt('PERF_REQUESTS', 200)
// Número claramente ficticio: NO se usa para enviar nada, solo para el
// lookup de /check, que solo consulta si existe (sin mandar mensajes).
const NUMERO_FICTICIO = '5215500000000'

console.log(`Probando ${BASE_URL} — ${REQUESTS} peticiones, concurrencia ${CONCURRENCY}...`)

const statusRes = await fetch(`${BASE_URL}/status`).catch(() => null)
if (!statusRes?.ok) {
  console.error(`\nNo se pudo contactar whatsapp-service en ${BASE_URL}.`)
  console.error('¿Está corriendo? (npm run dev, o npm run start -w whatsapp-service)\n')
  process.exit(1)
}

async function hitStatus() {
  const res = await fetch(`${BASE_URL}/status`)
  if (!res.ok) throw new Error(`status ${res.status}`)
  await res.json()
}

async function hitCheck() {
  const res = await fetch(`${BASE_URL}/check/${NUMERO_FICTICIO}`)
  // 503 (no conectado aún) es una respuesta válida bajo prueba, no un fallo del servidor.
  if (res.status >= 500 && res.status !== 503) throw new Error(`check ${res.status}`)
  await res.json().catch(() => null)
}

const statusResult = await runConcurrent(REQUESTS, CONCURRENCY, hitStatus)
printReport('08a · GET /status bajo carga', {
  ...statusResult,
  extra: { concurrencia: CONCURRENCY, url: `${BASE_URL}/status` },
})

const checkResult = await runConcurrent(REQUESTS, CONCURRENCY, hitCheck)
printReport('08b · GET /check/:telefono bajo carga', {
  ...checkResult,
  extra: { concurrencia: CONCURRENCY, url: `${BASE_URL}/check/${NUMERO_FICTICIO}` },
})
