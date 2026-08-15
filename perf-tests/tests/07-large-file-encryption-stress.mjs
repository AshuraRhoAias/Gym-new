// 07 — Estrés de conversión bytes→base64 con archivos grandes.
//
// Reproduce directamente el bug que causaba "Maximum call stack size
// exceeded" al subir PDFs/Excel grandes (btoa(String.fromCharCode(...bytes))
// revienta el límite de argumentos del motor JS). Esta prueba usa la MISMA
// implementación en bloques que src/lib/crypto.ts#bytesToBase64 — si ese
// archivo cambia, actualiza esta copia — contra buffers sintéticos de
// distintos tamaños, para confirmar que ya no hay tope de tamaño y medir
// el throughput de conversión (MB/s).
//
// 100% en memoria: no toca la red ni la base de datos.
import { summarize } from '../lib/stats.mjs'

// Copia intencional de src/lib/crypto.ts#bytesToBase64 (Node no puede
// importar ese archivo directo: depende de import.meta.env de Vite).
function bytesToBase64(bytes) {
  const CHUNK_SIZE = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

// La versión rota que causaba el crash — se corre solo contra tamaños
// chicos para *demostrar* la falla sin tronar el proceso completo.
function bytesToBase64Roto(bytes) {
  return Buffer.from(String.fromCharCode(...bytes), 'binary').toString('base64')
}

const MB = 1024 * 1024
const SIZES_MB = [1, 5, 20, 50, 100]

console.log('Reproduciendo el bug original (spread) contra un archivo de 1MB...')
try {
  bytesToBase64Roto(new Uint8Array(1 * MB))
  console.log('  (no truena con 1MB en este motor/versión de Node — igual el chunking es la forma correcta)\n')
} catch (err) {
  console.log(`  ❌ falla como se esperaba: ${err.message}\n`)
}

console.log('Midiendo la versión corregida (bytesToBase64 en bloques) por tamaño de archivo...\n')

for (const sizeMb of SIZES_MB) {
  const bytes = new Uint8Array(sizeMb * MB)
  crypto.getRandomValues(bytes.subarray(0, Math.min(bytes.length, 65536))) // no hace falta llenarlo todo de random

  const samples = []
  const reps = sizeMb <= 5 ? 5 : 2
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now()
    const b64 = bytesToBase64(bytes)
    samples.push(performance.now() - t0)
    if (b64.length === 0) throw new Error('conversión vacía inesperada')
  }

  const s = summarize(samples)
  const throughputMBs = sizeMb / (s.avg / 1000)
  console.log(`  ${String(sizeMb).padStart(3)}MB → avg ${s.avg.toFixed(1)}ms  (${throughputMBs.toFixed(1)} MB/s)  ✅ sin stack overflow`)
}
console.log('')
