import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getWhatsAppStatus } from '../lib/whatsappService'

const POLL_MS = 5000

/**
 * Sondea el servicio local de WhatsApp (whatsapp-service/). Si está
 * desconectado (servicio caído o sesión sin vincular) muestra un modal con
 * el QR vigente, que se refresca solo mientras siga cambiando.
 */
export default function WhatsAppStatusModal() {
  const [connected, setConnected] = useState(true)
  const [qr, setQr] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const checkedOnce = useRef(false)

  useEffect(() => {
    let active = true
    const poll = async () => {
      const status = await getWhatsAppStatus()
      if (!active) return
      setConnected(status.connected)
      setQr(status.qr)
      if (status.connected) setDismissed(false)
      checkedOnce.current = true
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (connected || dismissed || !checkedOnce.current) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 print:hidden">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-3">
        <MessageCircle className="text-accent" size={26} />
        <h2 className="text-white font-semibold">WhatsApp desconectado</h2>
        <p className="text-sm text-gray-400">
          El envío automático de QR por WhatsApp necesita que se vincule (o revincule) la sesión.
        </p>
        {qr ? (
          <>
            <img src={qr} alt="Código QR de WhatsApp" className="w-56 h-56 rounded-lg border border-border bg-white p-2" />
            <p className="text-xs text-gray-500">
              Escanéalo desde el celular del gimnasio: WhatsApp → Ajustes → Dispositivos vinculados → Vincular un
              dispositivo. Se actualiza solo si cambia.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Esperando al servicio de WhatsApp local (whatsapp-service). Verifica que esté corriendo con{' '}
            <code className="bg-surface-2 px-1 rounded">npm start</code> en esa carpeta.
          </p>
        )}
        <button onClick={() => setDismissed(true)} className="text-xs text-gray-500 hover:text-gray-300 mt-1">
          Ocultar por ahora
        </button>
      </div>
    </div>
  )
}
