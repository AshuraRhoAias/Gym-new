import { useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { decryptBytes } from '../lib/crypto'

interface EncryptedPhotoViewerProps {
  path: string
  iv: string
  salt: string
}

export default function EncryptedPhotoViewer({ path, iv, salt }: EncryptedPhotoViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reveal = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dlErr } = await supabase.storage.from('fotos').download(path)
      if (dlErr || !data) throw dlErr ?? new Error('No se encontró la foto')
      const cipherBytes = new Uint8Array(await data.arrayBuffer())
      const cipherB64 = btoa(String.fromCharCode(...cipherBytes))
      const plainBytes = await decryptBytes({ c: cipherB64, iv, s: salt })
      const blob = new Blob([plainBytes.buffer as ArrayBuffer])
      setUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descifrar la foto')
    } finally {
      setLoading(false)
    }
  }

  if (url) {
    return <img src={url} alt="Foto del alumno" className="w-32 h-32 object-cover rounded-lg border border-border" />
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={reveal}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-gray-300 hover:border-accent/50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ImageOff size={12} />}
        {loading ? 'Descifrando…' : 'Ver foto (cifrada)'}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
