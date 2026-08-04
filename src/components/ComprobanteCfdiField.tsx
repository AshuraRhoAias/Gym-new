import { useRef, useState } from 'react'
import { Paperclip, Loader2, Eye, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { encryptBytes, decryptBytes } from '../lib/crypto'
import type { ComprobanteCfdi } from '../types/database'

const BUCKET = 'comprobantes-financieros'

interface ComprobanteCfdiFieldProps {
  folio: string
  onFolioChange: (v: string) => void
  comprobante: Pick<ComprobanteCfdi, 'comprobante_path' | 'comprobante_iv' | 'comprobante_salt' | 'comprobante_mime'>
  onComprobanteChange: (v: Pick<ComprobanteCfdi, 'comprobante_path' | 'comprobante_iv' | 'comprobante_salt' | 'comprobante_mime'>) => void
}

/** Folio del ticket/CFDI + foto o PDF cifrado del comprobante, para validar ante el SAT. */
export default function ComprobanteCfdiField({
  folio,
  onFolioChange,
  comprobante,
  onComprobanteChange,
}: ComprobanteCfdiFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { c, iv, s } = await encryptBytes(bytes)
      const cipherBytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
      const path = `${crypto.randomUUID()}.enc`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, cipherBytes, {
        contentType: 'application/octet-stream',
      })
      if (uploadErr) throw uploadErr
      onComprobanteChange({
        comprobante_path: path,
        comprobante_iv: iv,
        comprobante_salt: s,
        comprobante_mime: file.type || 'application/octet-stream',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el comprobante')
    } finally {
      setUploading(false)
    }
  }

  const handleView = async () => {
    if (!comprobante.comprobante_path || !comprobante.comprobante_iv || !comprobante.comprobante_salt) return
    setViewing(true)
    setError(null)
    try {
      const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(comprobante.comprobante_path)
      if (dlErr || !data) throw dlErr ?? new Error('No se encontró el comprobante')
      const cipherBytes = new Uint8Array(await data.arrayBuffer())
      const cipherB64 = btoa(String.fromCharCode(...cipherBytes))
      const plainBytes = await decryptBytes({ c: cipherB64, iv: comprobante.comprobante_iv, s: comprobante.comprobante_salt })
      const blob = new Blob([plainBytes.buffer as ArrayBuffer], {
        type: comprobante.comprobante_mime || 'application/octet-stream',
      })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante')
    } finally {
      setViewing(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start">
      <input
        value={folio}
        onChange={(e) => onFolioChange(e.target.value)}
        placeholder="Folio del ticket/CFDI"
        className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs bg-surface-2 border border-border rounded-md px-2.5 py-2 text-gray-300 hover:border-accent/50 disabled:opacity-60"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
        {uploading ? 'Subiendo…' : comprobante.comprobante_path ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
      </button>
      {comprobante.comprobante_path && (
        <>
          <CheckCircle2 size={16} className="text-accent shrink-0 mt-2" />
          <button
            type="button"
            onClick={handleView}
            disabled={viewing}
            className="flex items-center gap-1.5 text-xs bg-surface-2 border border-border rounded-md px-2.5 py-2 text-gray-300 hover:border-accent/50 disabled:opacity-60"
          >
            {viewing ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
            Ver
          </button>
        </>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
