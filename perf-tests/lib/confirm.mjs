import { SUPABASE_URL } from './supabaseClient.mjs'

export const PERF_TAG = 'perf-test-suite'

const isLocalTarget = /127\.0\.0\.1|localhost/.test(SUPABASE_URL)

/**
 * Los tests que escriben datos exigen esta confirmación explícita antes de
 * correr. Contra un Supabase LOCAL (Docker, desechable) es solo un
 * recordatorio rápido; contra producción es una salvaguarda real. Todo lo
 * que insertan queda marcado con PERF_TAG para poder limpiarlo después con
 * `node perf-tests/cleanup.mjs`.
 */
export function requireWriteConfirmation(testName) {
  if (process.env.PERF_TEST_CONFIRM === 'I_UNDERSTAND') return

  if (isLocalTarget) {
    console.error(`\n"${testName}" va a escribir datos de prueba en tu Supabase LOCAL (${SUPABASE_URL}).`)
    console.error('Corre con PERF_TEST_CONFIRM=I_UNDERSTAND para continuar (perf-tests/.env.local.example ya lo trae).\n')
    process.exit(1)
  }

  console.error(`\n⚠️  "${testName}" escribe datos de prueba en la base de datos de PRODUCCIÓN (${SUPABASE_URL}).`)
  console.error(`    Todo queda marcado con "${PERF_TAG}" y se puede borrar con perf-tests/cleanup.mjs,`)
  console.error('    pero igual corre en la base real: úsalo con criterio (fuera de horario pico, etc).')
  console.error('    Considera mejor apuntar a Supabase local — ver "Correr contra Supabase local" en el README.')
  console.error('\n    Vuelve a correr con PERF_TEST_CONFIRM=I_UNDERSTAND si quieres continuar de todos modos.\n')
  process.exit(1)
}
