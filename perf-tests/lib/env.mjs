import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PERF_TESTS_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const ROOT = path.resolve(PERF_TESTS_DIR, '..')

/** Parser mínimo `CLAVE=valor` (sin dotenv como dependencia nueva). */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf-8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

/**
 * Carga variables a `process.env` sin pisar lo que ya haya (shell > archivos).
 * Prioridad: `perf-tests/.env.local` (target de pruebas dedicado, ej. Supabase
 * local) > `.env` de la raíz del repo (el que usa la app en desarrollo).
 */
export function loadEnv() {
  parseEnvFile(path.join(PERF_TESTS_DIR, '.env.local'))
  parseEnvFile(path.join(ROOT, '.env'))
}

loadEnv()
