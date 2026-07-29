import { useRef, useState } from 'react'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { encryptBytes } from '../lib/crypto'

export interface FotoRef {
  path: string
  iv: string
  salt: string
}

interface EncryptedPhotoFieldProps {
  value: FotoRef | null
  onChange: (value: FotoRef | null) => void
}

const BUCKET = 'fotos'

export default function EncryptedPhotoField({ value, onChange }: EncryptedPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { c, iv, s } = await encryptBytes(bytes)
      const cipherBytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
      const path = `${crypto.randomUUID()}.enc`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, cipherBytes, {
        contentType: 'application/octet-stream',
      })
      if (uploadErr) throw uploadErr
      onChange({ path, iv, salt: s })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-24 h-24 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-accent/50 overflow-hidden relative"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Foto del alumno" className="w-full h-full object-cover" />
        ) : (
          <>
            <Camera size={18} />
            <span className="text-[10px] text-center leading-tight px-1">Haz clic para subir foto</span>
          </>
        )}
        {uploading && (
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
      <p className="text-[10px] text-gray-500 mt-1">Se cifra antes de subirse (AES-256-GCM)</p>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
