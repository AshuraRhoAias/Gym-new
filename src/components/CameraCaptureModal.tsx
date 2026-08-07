import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react'
import { listScanSources, type ScanSource } from '../lib/scanSources'

interface CameraCaptureModalProps {
  title?: string
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * Escaneo de documentos por cámara: abre la cámara (permite elegir entre
 * varias si hay más de una, p. ej. un escáner físico expuesto como cámara
 * de video), captura una foto y la muestra en vista previa antes de
 * confirmar. Ver `src/lib/scanSources.ts` para agregar más adelante fuentes
 * de impresoras/escáneres físicos (driver TWAIN/WIA/SANE) a este mismo selector.
 */
export default function CameraCaptureModal({
  title = 'Escanear documento',
  onCapture,
  onClose,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [sources, setSources] = useState<ScanSource[]>([])
  const [sourceId, setSourceId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (photoDataUrl) return
    let cancelled = false

    async function start() {
      setStarting(true)
      setError(null)
      stopStream()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: sourceId ? { deviceId: { exact: sourceId } } : { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        const found = await listScanSources()
        if (!cancelled) setSources(found)
      } catch {
        if (!cancelled) setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, photoDataUrl])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.92))
    stopStream()
  }

  const confirm = async () => {
    if (!photoDataUrl) return
    const res = await fetch(photoDataUrl)
    const blob = await res.blob()
    onCapture(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl p-4 w-full max-w-md flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium text-sm">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4]">
          {photoDataUrl ? (
            <img src={photoDataUrl} alt="Vista previa del documento" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          )}
          {starting && !photoDataUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          )}
        </div>

        {!photoDataUrl && sources.length > 1 && (
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Cámara predeterminada</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        {photoDataUrl ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhotoDataUrl(null)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-surface-2 border border-border rounded-lg py-2 text-sm text-gray-300 hover:border-accent/50"
            >
              <RotateCcw size={14} /> Repetir
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg py-2 text-sm font-medium"
            >
              <Check size={14} /> Usar esta imagen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={capture}
            disabled={starting || !!error}
            className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg py-2 text-sm font-medium disabled:opacity-60"
          >
            <Camera size={14} /> Capturar
          </button>
        )}
      </div>
    </div>
  )
}
