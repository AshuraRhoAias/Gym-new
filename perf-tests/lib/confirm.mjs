export const PERF_TAG = 'perf-test-suite'

/**
 * Los tests que escriben datos en la base de PRODUCCIÓN (gymtech) exigen
 * esta confirmación explícita para evitar corridas accidentales. Todo lo
 * que insertan queda marcado con PERF_TAG para poder limpiarlo después con
 * `node perf-tests/cleanup.mjs`.
 */
export function requireWriteConfirmation(testName) {
  if (process.env.PERF_TEST_CONFIRM !== 'I_UNDERSTAND') {
    console.error(`\n⚠️  "${testName}" escribe datos de prueba en la base de datos de PRODUCCIÓN (gymtech).`)
    console.error(`    Todo queda marcado con "${PERF_TAG}" y se puede borrar con perf-tests/cleanup.mjs,`)
    console.error('    pero igual corre en la base real: úsalo con criterio (fuera de horario pico, etc).')
    console.error('\n    Vuelve a correr con PERF_TEST_CONFIRM=I_UNDERSTAND si quieres continuar.\n')
    process.exit(1)
  }
}
