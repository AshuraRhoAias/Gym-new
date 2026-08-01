import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export interface SignaturePadHandle {
  isEmpty: () => boolean
  toBlob: () => Promise<Blob | null>
  clear: () => void
}

interface SignaturePadProps {
  onChange?: (hasSignature: boolean) => void
}

/**
 * Lienzo de firma táctil: funciona igual con mouse (escritorio) que con el
 * dedo o un stylus (celular/tablet), usando Pointer Events unificados.
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0a0a0d'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = getPos(e)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPointRef.current) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPointRef.current = pos
    if (!hasInkRef.current) {
      hasInkRef.current = true
      setEmpty(false)
      onChange?.(true)
    }
  }

  const end = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInkRef.current = false
    setEmpty(true)
    onChange?.(false)
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasInkRef.current,
    clear,
    toBlob: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) return resolve(null)
        canvas.toBlob((b) => resolve(b), 'image/png')
      }),
  }))

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className="w-full h-40 bg-white rounded-lg border border-border touch-none"
      />
      <button
        type="button"
        onClick={clear}
        disabled={empty}
        className="self-start flex items-center gap-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-40"
      >
        <Eraser size={12} /> Limpiar firma
      </button>
    </div>
  )
})

export default SignaturePad
