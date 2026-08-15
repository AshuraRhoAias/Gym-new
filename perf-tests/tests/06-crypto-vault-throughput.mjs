// 06 — Throughput de la Edge Function `crypto-vault` bajo concurrencia.
//
// Cada teléfono, foto y comprobante de la app pasa por esta función
// (cifra/descifra vía AES-GCM en Deno). Es un cuello de botella potencial:
// si muchos usuarios suben/leen documentos a la vez, todo pasa por aquí.
// Esta prueba dispara cifrados+descifrados concurrentes y mide la latencia
// y tasa de error de la función bajo carga.
//
// No escribe en tablas (solo invoca la Edge Function), pero sí genera
// carga real sobre el proyecto de producción.
import { createAuthedClient } from '../lib/supabaseClient.mjs'
import { runConcurrent, printReport, envInt } from '../lib/stats.mjs'

const CONCURRENCY = envInt('PERF_CONCURRENCY', 15)
const REQUESTS = envInt('PERF_REQUESTS', 60)

const client = await createAuthedClient()
console.log(`Disparando ${REQUESTS} ciclos cifrar+descifrar (concurrencia ${CONCURRENCY}) contra crypto-vault...`)

async function encryptDecryptCycle(i) {
  const plaintext = `perf-test-payload-${i}-${'x'.repeat(200)}`
  const { data: enc, error: encErr } = await client.functions.invoke('crypto-vault', {
    body: { action: 'encrypt', plaintext },
  })
  if (encErr) throw encErr

  const { data: dec, error: decErr } = await client.functions.invoke('crypto-vault', {
    body: { action: 'decrypt', payload: enc },
  })
  if (decErr) throw decErr
  if (dec?.plaintext !== plaintext) throw new Error('round-trip no coincide')
}

const { samples, errors, totalMs } = await runConcurrent(REQUESTS, CONCURRENCY, encryptDecryptCycle)

printReport('06 · crypto-vault (cifrar + descifrar)', {
  samples,
  errors,
  totalMs,
  extra: { concurrencia: CONCURRENCY, ciclos: REQUESTS },
})
