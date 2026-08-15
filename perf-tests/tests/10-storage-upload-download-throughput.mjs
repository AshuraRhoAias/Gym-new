// 10 — Throughput de Supabase Storage (subir/bajar comprobantes grandes).
//
// Sube y luego descarga archivos sintéticos de distintos tamaños al bucket
// de comprobantes (mismo patrón que ComprobanteCfdiField/DocumentoUploadField:
// bytes "cifrados" subidos como application/octet-stream), midiendo MB/s en
// cada sentido. Bueno para saber si adjuntar un PDF/Excel pesado se siente
// lento por el archivo en sí, más allá del bug de cifrado ya corregido.
//
// Escribe archivos de prueba en el bucket de producción bajo el prefijo
// "perf-test/" y los borra al terminar (a menos que pongas PERF_KEEP_FILES=1).
import { createAuthedClient } from '../lib/supabaseClient.mjs'
import { requireWriteConfirmation } from '../lib/confirm.mjs'

requireWriteConfirmation('10-storage-upload-download-throughput')

const BUCKET = process.env.PERF_BUCKET || 'comprobantes-financieros'
const KEEP_FILES = process.env.PERF_KEEP_FILES === '1'
const MB = 1024 * 1024
const SIZES_MB = [1, 5, 20]

const client = await createAuthedClient()
console.log(`Subiendo/bajando archivos de prueba a "${BUCKET}" (prefijo perf-test/)...\n`)

const uploaded = []

for (const sizeMb of SIZES_MB) {
  const bytes = new Uint8Array(sizeMb * MB)
  const path = `perf-test/${Date.now()}-${sizeMb}mb.bin`

  const upStart = performance.now()
  const { error: upErr } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'application/octet-stream',
  })
  const upMs = performance.now() - upStart

  if (upErr) {
    console.log(`  ${sizeMb}MB → ❌ subida falló: ${upErr.message}`)
    continue
  }
  uploaded.push(path)

  const downStart = performance.now()
  const { data: downData, error: downErr } = await client.storage.from(BUCKET).download(path)
  const downMs = performance.now() - downStart

  if (downErr || !downData) {
    console.log(`  ${sizeMb}MB → subida ok, ❌ descarga falló: ${downErr?.message}`)
    continue
  }

  const upThroughput = sizeMb / (upMs / 1000)
  const downThroughput = sizeMb / (downMs / 1000)
  console.log(
    `  ${String(sizeMb).padStart(3)}MB → subida ${upMs.toFixed(0)}ms (${upThroughput.toFixed(1)} MB/s)` +
      `  ·  bajada ${downMs.toFixed(0)}ms (${downThroughput.toFixed(1)} MB/s)`,
  )
}

if (!KEEP_FILES && uploaded.length > 0) {
  const { error: rmErr } = await client.storage.from(BUCKET).remove(uploaded)
  console.log(rmErr ? `\n⚠️ no se pudieron borrar los archivos de prueba: ${rmErr.message}` : '\nArchivos de prueba borrados.')
} else if (uploaded.length > 0) {
  console.log(`\nPERF_KEEP_FILES=1: se dejaron ${uploaded.length} archivo(s) en "${BUCKET}/perf-test/".`)
}

console.log('')
