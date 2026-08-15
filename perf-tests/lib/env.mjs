import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')

/**
 * Carga `.env` de la raíz del repo a `process.env` (sin pisar variables ya
 * definidas por el shell). No usa dotenv: parser mínimo suficiente para
 * líneas `CLAVE=valor`, ignorando comentarios y líneas vacías.
 */
export function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
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

loadEnv()
