/** Percentil `p` (0-100) sobre una lista de números en milisegundos. */
export function percentile(samples, p) {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}

export function summarize(samples) {
  if (samples.length === 0) {
    return { count: 0, min: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0 }
  }
  const sum = samples.reduce((a, b) => a + b, 0)
  return {
    count: samples.length,
    min: Math.min(...samples),
    avg: sum / samples.length,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    p99: percentile(samples, 99),
    max: Math.max(...samples),
  }
}

function ms(n) {
  return `${n.toFixed(1)}ms`
}

/** Imprime un reporte homogéneo para todas las pruebas: latencias + throughput + errores. */
export function printReport(title, { samples, errors = 0, totalMs, extra = {} }) {
  const s = summarize(samples)
  console.log(`\n=== ${title} ===`)
  console.log(`  peticiones exitosas : ${s.count}`)
  console.log(`  errores             : ${errors}`)
  if (totalMs != null) {
    console.log(`  tiempo total        : ${ms(totalMs)}`)
    console.log(`  throughput          : ${(s.count / (totalMs / 1000)).toFixed(2)} req/s`)
  }
  console.log(`  latencia min/avg/max: ${ms(s.min)} / ${ms(s.avg)} / ${ms(s.max)}`)
  console.log(`  p50 / p95 / p99     : ${ms(s.p50)} / ${ms(s.p95)} / ${ms(s.p99)}`)
  for (const [k, v] of Object.entries(extra)) console.log(`  ${k.padEnd(20)}: ${v}`)
  console.log('')
}

/** Corre `count` tareas con un máximo de `concurrency` en vuelo a la vez. */
export async function runConcurrent(count, concurrency, task) {
  const samples = []
  let errors = 0
  let next = 0

  async function worker() {
    while (next < count) {
      const i = next++
      const start = performance.now()
      try {
        await task(i)
        samples.push(performance.now() - start)
      } catch {
        errors++
      }
    }
  }

  const start = performance.now()
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker))
  const totalMs = performance.now() - start
  return { samples, errors, totalMs }
}

export function envInt(name, fallback) {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}
