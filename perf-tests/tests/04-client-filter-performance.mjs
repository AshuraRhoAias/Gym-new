// 04 — Rendimiento del filtro/búsqueda en memoria (tablas grandes en el navegador).
//
// Páginas como Whats y GastosTab filtran arreglos completos en cada
// tecleo del buscador (mismo patrón: nombre/folio/teléfono incluye texto).
// Esta prueba replica exactamente esa lógica sobre datasets sintéticos
// cada vez más grandes, para saber a partir de qué tamaño el filtrado deja
// de sentirse instantáneo en cada tecla.
//
// 100% en memoria: no toca la red ni la base de datos, es seguro correrla
// las veces que quieras.
import { summarize } from '../lib/stats.mjs'

function makeDataset(n) {
  const arr = new Array(n)
  for (let i = 0; i < n; i++) {
    arr[i] = {
      id: String(i),
      nombre: `Socio de prueba ${i}`,
      folio: String(1000 + i),
      telefono: `55${String(10000000 + i).padStart(8, '0')}`,
    }
  }
  return arr
}

// Mismo predicado que src/pages/Whats.tsx / src/components/finanzas/GastosTab.tsx.
function filtrar(data, telefonos, q) {
  const query = q.toLowerCase()
  return data.filter(
    (r) =>
      r.nombre.toLowerCase().includes(query) ||
      (r.folio ?? '').toLowerCase().includes(query) ||
      (telefonos[r.id] ?? '').includes(query),
  )
}

const SIZES = [1_000, 10_000, 50_000, 100_000]
const PASSES = 30 // simula 30 teclas escritas seguidas

console.log('Midiendo tiempo de filtrado en memoria por tamaño de dataset...\n')

for (const size of SIZES) {
  const data = makeDataset(size)
  const telefonos = Object.fromEntries(data.map((r) => [r.id, r.telefono]))
  const queries = ['5', '55', '551', 'socio', 'de prueba 999', '1099']

  const samples = []
  for (let p = 0; p < PASSES; p++) {
    const q = queries[p % queries.length]
    const t0 = performance.now()
    const result = filtrar(data, telefonos, q)
    samples.push(performance.now() - t0)
    void result
  }

  const s = summarize(samples)
  const veredicto = s.avg < 16 ? '✅ fluido (<16ms, 60fps)' : s.avg < 50 ? '⚠️ perceptible' : '❌ traba la UI'
  console.log(`  ${String(size).padStart(7)} filas → avg ${s.avg.toFixed(2)}ms, p95 ${s.p95.toFixed(2)}ms  ${veredicto}`)
}
console.log('')
