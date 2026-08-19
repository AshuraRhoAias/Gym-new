import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Loader2, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { encryptBytes, decryptBytes, bytesToBase64 } from '../lib/crypto'
import { compressImage } from '../lib/image'
import CameraCaptureModal from './CameraCaptureModal'

export interface FotoRef {
  path: string
  iv: string
  salt: string
  /** Fecha/hora (ISO) en que se subió esta credencial. */
  uploadedAt: string
}

interface EncryptedPhotoFieldProps {
  value: FotoRef | null
  onChange: (value: FotoRef | null) => void
  /** Texto del botón/alt cuando no hay foto. Default: "credencial". */
  label?: string
  /** Muestra el botón "Tomar foto" (cámara en vivo). Default: true. */
  allowCamera?: boolean
}

const BUCKET = 'fotos'

export default function EncryptedPhotoField({
  value,
  onChange,
  label = 'credencial',
  allowCamera = true,
}: EncryptedPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [camaraAbierta, setCamaraAbierta] = useState(false)

  // Si el campo llega con un valor ya existente (se está editando un
  // registro) y todavía no hay preview local (no se acaba de subir nada en
  // esta sesión), se descifra en segundo plano para mostrar la miniatura en
  // vez de solo el ícono genérico.
  useEffect(() => {
    if (!value || previewUrl) return
    let cancelled = false
    setLoadingPreview(true)
    ;(async () => {
      try {
        const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(value.path)
        if (dlErr || !data) throw dlErr ?? new Error('No se encontró el archivo')
        const cipherBytes = new Uint8Array(await data.arrayBuffer())
        const cipherB64 = bytesToBase64(cipherBytes)
        const plainBytes = await decryptBytes({ c: cipherB64, iv: value.iv, s: value.salt })
        const blob = new Blob([plainBytes.buffer as ArrayBuffer], { type: 'image/jpeg' })
        if (!cancelled) setPreviewUrl(URL.createObjectURL(blob))
      } catch {
        // Silencioso: si no se puede descifrar el preview, se deja el ícono genérico.
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.path])

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const comprimida = await compressImage(file)
      const bytes = new Uint8Array(await comprimida.arrayBuffer())
      const { c, iv, s } = await encryptBytes(bytes)
      const cipherBytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
      const path = `${crypto.randomUUID()}.enc`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, cipherBytes, {
        contentType: 'application/octet-stream',
      })
      if (uploadErr) throw uploadErr
      onChange({ path, iv, salt: s, uploadedAt: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo subir la ${label}`)
      onChange(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-accent/50 overflow-hidden relative shrink-0"
        >
          {previewUrl ? (
            <img src={previewUrl} alt={`Foto de ${label}`} className="w-full h-full object-cover" />
          ) : (
            <>
              <Paperclip size={18} />
              <span className="text-[10px] text-center leading-tight px-1">Haz clic para subir {label}</span>
            </>
          )}
          {(uploading || loadingPreview) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-white" />
            </div>
          )}
          {value && !uploading && (
            <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
              <CheckCircle2 size={14} className="text-accent" />
            </div>
          )}
        </button>
        {allowCamera && (
          <button
            type="button"
            onClick={() => setCamaraAbierta(true)}
            disabled={uploading}
            className="flex items-center gap-1 text-xs bg-surface-2 border border-border rounded-md px-2 py-1 text-gray-300 hover:border-accent/50 disabled:opacity-60"
          >
            <Camera size={13} /> Tomar foto
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-1">Se comprime y cifra antes de subirse (AES-256-GCM)</p>
      {value?.uploadedAt && (
        <p className="text-[10px] text-gray-500">Subida: {new Date(value.uploadedAt).toLocaleString('es-MX')}</p>
      )}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      {camaraAbierta && (
        <CameraCaptureModal
          title={`Tomar foto: ${label}`}
          onClose={() => setCamaraAbierta(false)}
          onCapture={(file) => {
            setCamaraAbierta(false)
            handleFile(file)
          }}
        />
      )}
    </div>
  )
}
