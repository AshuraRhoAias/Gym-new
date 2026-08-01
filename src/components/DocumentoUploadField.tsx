import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Paperclip, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { encryptBytes, decryptBytes } from '../lib/crypto'
import { useAuth } from '../context/AuthContext'
import type { DocumentoArchivo } from '../types/database'

const BUCKET = 'documentos'

interface DocumentoUploadFieldProps {
  registroId: string
  documento: string
  archivo: DocumentoArchivo | null
  onUploaded: (archivo: DocumentoArchivo) => void
}

export default function DocumentoUploadField({
  registroId,
  documento,
  archivo,
  onUploaded,
}: DocumentoUploadFieldProps) {
  const { username } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { c, iv, s } = await encryptBytes(bytes)
      const cipherBytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
      const path = `${registroId}/${documento}-${Date.now()}.enc`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, cipherBytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      })
      if (uploadErr) throw uploadErr

      const { data, error: dbErr } = await supabase
        .from('documentos_archivos')
        .upsert(
          {
            registro_id: registroId,
            documento,
            file_path: path,
            file_iv: iv,
            file_salt: s,
            mime_type: file.type || 'application/octet-stream',
            uploaded_by: username,
          },
          { onConflict: 'registro_id,documento' },
        )
        .select('*')
        .single()
      if (dbErr || !data) throw dbErr ?? new Error('No se pudo guardar el documento')

      await supabase
        .from('documentos_entregados')
        .upsert({ registro_id: registroId, documento, entregado: true }, { onConflict: 'registro_id,documento' })

      onUploaded(data as DocumentoArchivo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setUploading(false)
    }
  }

  const handleView = async () => {
    if (!archivo) return
    setViewing(true)
    setError(null)
    try {
      const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(archivo.file_path)
      if (dlErr || !data) throw dlErr ?? new Error('No se encontró el archivo')
      const cipherBytes = new Uint8Array(await data.arrayBuffer())
      const cipherB64 = btoa(String.fromCharCode(...cipherBytes))
      const plainBytes = await decryptBytes({ c: cipherB64, iv: archivo.file_iv, s: archivo.file_salt })
      const blob = new Blob([plainBytes.buffer as ArrayBuffer], { type: archivo.mime_type })
      setViewUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo')
    } finally {
      setViewing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs bg-surface-2 border border-border rounded-md px-2 py-1 text-gray-300 hover:border-accent/50 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
          {uploading ? 'Subiendo…' : archivo ? 'Reemplazar' : 'Adjuntar foto/archivo'}
        </button>
        {archivo && (
          <>
            <CheckCircle2 size={13} className="text-accent shrink-0" />
            <button
              type="button"
              onClick={handleView}
              disabled={viewing}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent"
            >
              {viewing ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
              Ver
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {viewUrl && (
        <a href={viewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
          Abrir archivo descifrado
        </a>
      )}
    </div>
  )
}
