// Crea (si no existe) la cuenta de prueba dedicada en el Supabase LOCAL
// (Docker) y le da rol "admin" en `profiles`. Requiere `supabase start`
// corriendo y perf-tests/.env.local con SUPABASE_SERVICE_ROLE_KEY (ver
// perf-tests/.env.local.example — son las llaves fijas de siempre de un
// `supabase start` sin personalizar, no un secreto real).
import { createClient } from '@supabase/supabase-js'
import './lib/env.mjs'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.PERF_TEST_EMAIL
const password = process.env.PERF_TEST_PASSWORD

if (!URL || !SERVICE_KEY || !email || !password) {
  console.error(
    '\nFaltan variables. Copia perf-tests/.env.local.example a perf-tests/.env.local\n' +
      '(o exporta VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PERF_TEST_EMAIL, PERF_TEST_PASSWORD).\n',
  )
  process.exit(1)
}

if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(`\n⚠️  SUPABASE_URL (${URL}) no parece ser local.`)
  console.error('    Este script usa la service_role key: NUNCA lo corras contra producción.\n')
  process.exit(1)
}

const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

console.log(`Buscando/creando cuenta de prueba ${email} en ${URL}...`)

let userId
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (created?.user) {
  userId = created.user.id
  console.log('  ✅ usuario creado.')
} else if (createErr?.message?.toLowerCase().includes('already') || createErr?.status === 422) {
  console.log('  (ya existía, buscando su id...)')
  const { data: list, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) throw listErr
  const existing = list.users.find((u) => u.email === email)
  if (!existing) throw new Error(`No se encontró ${email} pese al error "already exists"`)
  userId = existing.id
} else if (createErr) {
  throw createErr
}

const { error: profileErr } = await admin
  .from('profiles')
  .upsert({ id: userId, username: 'perf-tests', role: 'admin' }, { onConflict: 'id' })

if (profileErr) throw profileErr

console.log(`  ✅ profiles.role = "admin" para ${email}.`)
console.log('\nListo — ya puedes correr las pruebas con PERF_TEST_EMAIL/PERF_TEST_PASSWORD apuntando a local.')
