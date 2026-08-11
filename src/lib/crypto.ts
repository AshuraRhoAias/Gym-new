import { supabase } from './supabase'

export interface CipherPayload {
  c: string
  iv: string
  s: string
}

/** Prefijo para distinguir un valor cifrado (JSON) de texto plano heredado. */
const CIPHER_PREFIX = 'enc1:'

function isCipherPayload(value: unknown): value is CipherPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as CipherPayload).c === 'string' &&
    typeof (value as CipherPayload).iv === 'string' &&
    typeof (value as CipherPayload).s === 'string'
  )
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('crypto-vault', { body })
  if (error) throw error
  return data as T
}

/** Cifra texto y lo serializa como string listo para guardar en una columna `text`. */
export async function encryptText(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  const payload = await invoke<CipherPayload>({ action: 'encrypt', plaintext })
  return CIPHER_PREFIX + JSON.stringify(payload)
}

/**
 * Descifra un string previamente producido por `encryptText`. Si el valor no
 * tiene el prefijo de cifrado (datos anteriores a esta funcionalidad), se
 * devuelve tal cual.
 */
export async function decryptText(stored: string | null): Promise<string> {
  if (!stored) return ''
  if (!stored.startsWith(CIPHER_PREFIX)) return stored
  try {
    const payload = JSON.parse(stored.slice(CIPHER_PREFIX.length))
    if (!isCipherPayload(payload)) return stored
    const { plaintext } = await invoke<{ plaintext: string }>({ action: 'decrypt', payload })
    return plaintext
  } catch {
    return ''
  }
}

export async function encryptBytes(data: Uint8Array): Promise<CipherPayload> {
  const base64 = btoa(String.fromCharCode(...data))
  return invoke<CipherPayload>({ action: 'encrypt-bytes', data: base64 })
}

export async function decryptBytes(payload: CipherPayload): Promise<Uint8Array> {
  const { data } = await invoke<{ data: string }>({ action: 'decrypt-bytes', payload })
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Descarga, descifra y abre en una pestaña nueva un comprobante (foto/PDF) subido con ComprobanteCfdiField. */
export async function abrirComprobante(
  bucket: string,
  comprobante: { comprobante_path: string; comprobante_iv: string; comprobante_salt: string; comprobante_mime: string | null },
) {
  const { data, error } = await supabase.storage.from(bucket).download(comprobante.comprobante_path)
  if (error || !data) throw error ?? new Error('No se encontró el comprobante')
  const cipherBytes = new Uint8Array(await data.arrayBuffer())
  const cipherB64 = btoa(String.fromCharCode(...cipherBytes))
  const plainBytes = await decryptBytes({ c: cipherB64, iv: comprobante.comprobante_iv, s: comprobante.comprobante_salt })
  const blob = new Blob([plainBytes.buffer as ArrayBuffer], {
    type: comprobante.comprobante_mime || 'application/octet-stream',
  })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
}
