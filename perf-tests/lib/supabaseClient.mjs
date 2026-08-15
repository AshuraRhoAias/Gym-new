import './env.mjs'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

if (!URL || !KEY) {
  console.error(
    '\nFaltan credenciales de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY\n' +
      '(las mismas del .env de la raíz del proyecto) antes de correr las pruebas.\n',
  )
  process.exit(1)
}

/** Cliente sin sesión (útil solo para endpoints públicos; la mayoría de tablas exigen auth por RLS). */
export function createAnonClient() {
  return createClient(URL, KEY)
}

/**
 * Cliente autenticado con una cuenta de prueba dedicada (PERF_TEST_EMAIL /
 * PERF_TEST_PASSWORD). Úsalo SIEMPRE con un usuario de bajo privilegio
 * creado solo para estas pruebas — nunca con credenciales de un admin real.
 */
export async function createAuthedClient() {
  const email = process.env.PERF_TEST_EMAIL
  const password = process.env.PERF_TEST_PASSWORD
  if (!email || !password) {
    console.error(
      '\nEsta prueba necesita una cuenta dedicada: define PERF_TEST_EMAIL y PERF_TEST_PASSWORD\n' +
        '(ver perf-tests/.env.example). No uses tu cuenta personal ni una de superadmin real.\n',
    )
    process.exit(1)
  }
  const client = createClient(URL, KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('No se pudo iniciar sesión con la cuenta de prueba:', error.message)
    process.exit(1)
  }
  return client
}

export const SUPABASE_URL = URL
