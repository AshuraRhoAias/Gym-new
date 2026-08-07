import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CameraOff, Loader2 } from 'lucide-react'
import { listScanSources, type ScanSource } from '../lib/scanSources'

interface QrCameraScannerProps {
  onDetected: (token: string) => void
  onClose: () => void
}

/** Lector de QR en vivo: abre la cámara, permite elegir entre varias si hay más de una, y decodifica frame a frame. */
export default function QrCameraScanner({ onDetected, onClose }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectedRef = useRef(false)

  const [sources, setSources] = useState<ScanSource[]>([])
  const [sourceId, setSourceId] = useState('')
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const stopStream = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
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
        if (!cancelled) {
          setStarting(false)
          loop()
        }
      } catch {
        if (!cancelled) {
          setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
          setStarting(false)
        }
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId])

  function loop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (detectedRef.current) return
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) {
      detectedRef.current = true
      stopStream()
      onDetected(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        )}
      </div>

      {sources.length > 1 && (
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

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={() => {
          stopStream()
          onClose()
        }}
        className="flex items-center justify-center gap-2 bg-surface-2 border border-border rounded-lg py-2 text-sm text-gray-300 hover:border-accent/50"
      >
        <CameraOff size={14} /> Cerrar cámara
      </button>
    </div>
  )
}
