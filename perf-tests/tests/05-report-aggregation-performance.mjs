// 05 — Rendimiento de las agregaciones del Reporte financiero.
//
// ReporteTab suma montos por categoría/período con reduce()/Map en el
// navegador cada vez que cambian los datos. Esta prueba replica esa
// agregación sobre volúmenes sintéticos grandes de gastos y registros,
// para confirmar que el cálculo se mantiene rápido incluso con años de
// historial acumulado.
//
// 100% en memoria: no toca la red ni la base de datos.
import { summarize } from '../lib/stats.mjs'

const CATEGORIAS = ['papeleria', 'limpieza', 'insumos', 'internet', 'mantenimiento', 'renta_equipo', 'otros']

function makeGastos(n) {
  return Array.from({ length: n }, (_, i) => ({
    categoria: CATEGORIAS[i % CATEGORIAS.length],
    monto: Math.round(Math.random() * 5000) / 100,
    mes: String((i % 12) + 1),
    anio: 2020 + (i % 6),
  }))
}

function makeRegistros(n) {
  const formas = ['efectivo', 'tarjeta', 'transferencia']
  return Array.from({ length: n }, (_, i) => ({
    monto: Math.round(Math.random() * 100000) / 100,
    forma_pago: formas[i % formas.length],
    mes: String((i % 12) + 1),
    anio: 2020 + (i % 6),
  }))
}

// Misma lógica que GastosTab.tsx / ReporteTab.tsx.
function agregar(gastos, registros) {
  const totalPorCategoria = new Map()
  for (const g of gastos) totalPorCategoria.set(g.categoria, (totalPorCategoria.get(g.categoria) ?? 0) + g.monto)

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const totalIngresos = registros.reduce((s, r) => s + r.monto, 0)

  const porFormaPago = new Map()
  for (const r of registros) porFormaPago.set(r.forma_pago, (porFormaPago.get(r.forma_pago) ?? 0) + r.monto)

  return { totalPorCategoria, totalGastos, totalIngresos, porFormaPago }
}

const SIZES = [500, 5_000, 20_000, 100_000]
const PASSES = 20

console.log('Midiendo tiempo de agregación del Reporte por volumen de histórico...\n')

for (const size of SIZES) {
  const gastos = makeGastos(size)
  const registros = makeRegistros(size)

  const samples = []
  for (let p = 0; p < PASSES; p++) {
    const t0 = performance.now()
    const result = agregar(gastos, registros)
    samples.push(performance.now() - t0)
    void result
  }

  const s = summarize(samples)
  console.log(`  ${String(size).padStart(7)} filas (c/u) → avg ${s.avg.toFixed(2)}ms, p95 ${s.p95.toFixed(2)}ms`)
}
console.log('')
