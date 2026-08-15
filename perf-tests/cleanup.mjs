// Borra todo lo que hayan dejado las pruebas de escritura (01, 10):
// - registros con atendido_por = "perf-test-suite"
// - archivos bajo el prefijo "perf-test/" en los buckets de Storage usados
import { createAuthedClient } from './lib/supabaseClient.mjs'
import { PERF_TAG } from './lib/confirm.mjs'

const BUCKETS = ['comprobantes-financieros', 'documentos', 'fotos']

const client = await createAuthedClient()

console.log(`Borrando registros marcados "${PERF_TAG}"...`)
const { error: delErr, count } = await client
  .from('registros')
  .delete({ count: 'exact' })
  .eq('atendido_por', PERF_TAG)
if (delErr) {
  console.error('  ❌', delErr.message)
} else {
  console.log(`  ✅ ${count ?? 0} registro(s) borrado(s).`)
}

for (const bucket of BUCKETS) {
  const { data: files, error: listErr } = await client.storage.from(bucket).list('perf-test')
  if (listErr) {
    console.log(`  (bucket "${bucket}": ${listErr.message})`)
    continue
  }
  if (!files || files.length === 0) continue
  const paths = files.map((f) => `perf-test/${f.name}`)
  const { error: rmErr } = await client.storage.from(bucket).remove(paths)
  console.log(
    rmErr
      ? `  ❌ bucket "${bucket}": ${rmErr.message}`
      : `  ✅ bucket "${bucket}": ${paths.length} archivo(s) de prueba borrado(s).`,
  )
}

console.log('\nListo.')
