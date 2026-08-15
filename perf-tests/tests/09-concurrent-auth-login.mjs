// 09 — Logins concurrentes contra Supabase Auth.
//
// Simula que todo el staff inicia sesión casi al mismo tiempo (ej. al abrir
// el gimnasio en la mañana), disparando N logins concurrentes con la MISMA
// cuenta de prueba. Mide la latencia de auth bajo concurrencia y expone si
// se empiezan a ver 429 (rate limit) de Supabase Auth.
//
// ⚠️ Supabase aplica rate-limiting a nivel de proyecto sobre signInWithPassword.
// Empieza con concurrencia baja (default 10): números altos solo van a
// generar errores de rate-limit, no información útil de rendimiento real.
import { createClient } from '@supabase/supabase-js'
import { runConcurrent, printReport, envInt } from '../lib/stats.mjs'
import { SUPABASE_URL } from '../lib/supabaseClient.mjs'
import '../lib/env.mjs'

const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
const CONCURRENCY = envInt('PERF_CONCURRENCY', 10)
const email = process.env.PERF_TEST_EMAIL
const password = process.env.PERF_TEST_PASSWORD

if (!email || !password) {
  console.error('\nDefine PERF_TEST_EMAIL y PERF_TEST_PASSWORD (cuenta de prueba dedicada) antes de correr esto.\n')
  process.exit(1)
}

console.log(`Simulando ${CONCURRENCY} logins concurrentes con la misma cuenta de prueba...`)
console.log('(números altos aquí solo miden el rate-limit de Supabase, no capacidad real — ver comentario arriba)\n')

async function login() {
  // Cada intento usa su propio cliente: signInWithPassword comparte estado
  // de sesión por instancia, y queremos medir logins independientes reales.
  const client = createClient(SUPABASE_URL, KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
}

const { samples, errors, totalMs } = await runConcurrent(CONCURRENCY, CONCURRENCY, login)

printReport('09 · Logins concurrentes', {
  samples,
  errors,
  totalMs,
  extra: { concurrencia: CONCURRENCY },
})
if (errors > 0) {
  console.log('  Nota: errores aquí suelen ser rate-limit de Supabase Auth, no un problema de la app.\n')
}
