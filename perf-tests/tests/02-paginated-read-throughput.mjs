// 02 — Throughput de lectura paginada en `registros`.
//
// Recorre la tabla página por página (como hace la app al listar un
// período), midiendo la latencia de cada página conforme el offset crece.
// Ayuda a detectar si las consultas se degradan con tablas grandes.
//
// Solo lee datos (no escribe nada) — seguro de correr contra producción,
// aunque igual consume cuota/tiempo del proyecto real.
import { createAuthedClient } from '../lib/supabaseClient.mjs'
import { printReport, envInt } from '../lib/stats.mjs'

const PAGES = envInt('PERF_PAGES', 20)
const PAGE_SIZE = envInt('PERF_PAGE_SIZE', 100)

const client = await createAuthedClient()
console.log(`Leyendo ${PAGES} páginas de ${PAGE_SIZE} filas cada una de "registros"...`)

const samples = []
let errors = 0
let totalRows = 0
const start = performance.now()

for (let page = 0; page < PAGES; page++) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const t0 = performance.now()
  const { data, error } = await client
    .from('registros')
    .select('id, nombre, mes, anio, estatus, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    errors++
    console.error(`  página ${page} falló:`, error.message)
    continue
  }
  samples.push(performance.now() - t0)
  totalRows += data?.length ?? 0
  if (!data || data.length < PAGE_SIZE) {
    console.log(`  (se acabaron las filas en la página ${page}, ${data?.length ?? 0} < ${PAGE_SIZE})`)
    break
  }
}

const totalMs = performance.now() - start
printReport('02 · Lectura paginada de registros', {
  samples,
  errors,
  totalMs,
  extra: { 'filas leídas': totalRows, 'tamaño de página': PAGE_SIZE },
})
