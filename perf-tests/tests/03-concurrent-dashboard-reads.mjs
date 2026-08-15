// 03 — Lecturas concurrentes tipo "varios admins abren Finanzas a la vez".
//
// Dispara N peticiones concurrentes que replican lo que carga la pestaña
// Reporte (registros + gastos_operativos + trabajadores del período actual),
// simulando que todo el staff abre el dashboard al mismo tiempo (ej. cierre
// de mes). Mide cómo se comporta la latencia bajo concurrencia real de
// varios "usuarios" golpeando la misma base a la vez.
//
// Solo lee datos — seguro de correr contra producción.
import { createAuthedClient } from '../lib/supabaseClient.mjs'
import { runConcurrent, printReport, envInt } from '../lib/stats.mjs'

const CONCURRENCY = envInt('PERF_CONCURRENCY', 20)
const now = new Date()
const MES = process.env.PERF_MES || String(now.getMonth() + 1)
const ANIO = envInt('PERF_ANIO', now.getFullYear())

const client = await createAuthedClient()
console.log(`Simulando ${CONCURRENCY} usuarios abriendo el Reporte de ${MES}/${ANIO} a la vez...`)

async function loadDashboard() {
  const [registros, gastos, trabajadores] = await Promise.all([
    client.from('registros').select('*').eq('mes', MES).eq('anio', ANIO),
    client.from('gastos_operativos').select('*').eq('mes', MES).eq('anio', ANIO),
    client.from('trabajadores').select('*').eq('activo', true),
  ])
  if (registros.error) throw registros.error
  if (gastos.error) throw gastos.error
  if (trabajadores.error) throw trabajadores.error
}

const { samples, errors, totalMs } = await runConcurrent(CONCURRENCY, CONCURRENCY, loadDashboard)

printReport('03 · Lecturas concurrentes del dashboard', {
  samples,
  errors,
  totalMs,
  extra: { 'usuarios simulados': CONCURRENCY, período: `${MES}/${ANIO}` },
})
