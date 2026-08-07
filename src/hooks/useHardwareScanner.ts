import { useEffect, useRef } from 'react'

/**
 * Los lectores de QR/código de barras USB o Bluetooth actúan como teclados:
 * escriben el contenido decodificado muy rápido (pocos milisegundos entre
 * tecla y tecla) y terminan con Enter. Este hook detecta ese patrón en
 * cualquier parte de la página, sin necesidad de un input enfocado a
 * propósito, y entrega el texto capturado.
 */
export function useHardwareScanner(onScan: (data: string) => void, enabled: boolean) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      const elapsed = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (elapsed > 60) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const data = bufferRef.current
        bufferRef.current = ''
        if (data.length >= 8) onScan(data)
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onScan])
}
