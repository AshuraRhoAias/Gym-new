// 01 — Throughput de inserción masiva en `registros`.
//
// Simula una temporada de inscripciones muy concurrida: inserta N registros
// sintéticos en lotes, midiendo cuánto tarda la base en aceptarlos. Sirve
// para detectar si un período de alta demanda (ej. inicio de semestre)
// puede saturar la tabla principal de la app.
//
// Escribe en la base de PRODUCCIÓN (marcado y limpiable, ver README).
import { createAuthedClient } from '../lib/supabaseClient.mjs'
import { printReport, envInt } from '../lib/stats.mjs'
import { requireWriteConfirmation, PERF_TAG } from '../lib/confirm.mjs'

requireWriteConfirmation('01-bulk-insert-registros')

const TOTAL = envInt('PERF_INSERT_COUNT', 500)
const BATCH_SIZE = envInt('PERF_BATCH_SIZE', 50)

function fakeRegistro(i) {
  return {
    kind: 'inscripcion',
    nombre: `PERF-TEST ${Date.now()}-${i}`,
    mes: 'PERF-TEST',
    anio: 9999,
    forma_pago: 'transferencia', // visible sin ser superadmin (RLS oculta 'efectivo')
    monto: Math.round(Math.random() * 1000) / 100,
    estatus: 'pendiente',
    atendido_por: PERF_TAG,
  }
}

const client = await createAuthedClient()
console.log(`Insertando ${TOTAL} registros en lotes de ${BATCH_SIZE}...`)

const batches = []
for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
  const size = Math.min(BATCH_SIZE, TOTAL - i)
  batches.push(Array.from({ length: size }, (_, j) => fakeRegistro(i + j)))
}

const samples = []
let errors = 0
let inserted = 0
const start = performance.now()

for (const batch of batches) {
  const t0 = performance.now()
  const { error, data } = await client.from('registros').insert(batch).select('id')
  if (error) {
    errors++
    console.error('  lote falló:', error.message)
  } else {
    samples.push(performance.now() - t0)
    inserted += data?.length ?? 0
  }
}

const totalMs = performance.now() - start
printReport('01 · Bulk insert registros (por lote)', {
  samples,
  errors,
  totalMs,
  extra: {
    'filas insertadas': inserted,
    'filas/seg (total)': (inserted / (totalMs / 1000)).toFixed(1),
    'tamaño de lote': BATCH_SIZE,
  },
})
console.log(`Limpieza: node perf-tests/cleanup.mjs   (borra todo lo marcado "${PERF_TAG}")`)
