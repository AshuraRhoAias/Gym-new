import { useState } from 'react'
import { Download, MessageCircle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { checkWhatsAppNumber, sendQrByWhatsApp, WHATSAPP_ERROR_LABEL } from '../lib/whatsappService'

interface QrShareCardProps {
  nombre: string
  dataUrl: string
  telefono: string | null
  monto?: number | null
  comisionTarjeta?: number | null
  onContinue: () => void
}

function waLink(telefono: string | null): string | null {
  if (!telefono) return null
  const digits = telefono.replace(/[^\d]/g, '')
  if (digits.length < 8) return null
  const text = encodeURIComponent(
    'Hola, aquí está tu código QR de acceso al gimnasio. Adjunta la imagen descargada a este chat para guardarla.',
  )
  return `https://wa.me/${digits}?text=${text}`
}

type EnvioEstado = 'idle' | 'validando' | 'enviando' | 'enviado' | 'error'

export default function QrShareCard({
  nombre,
  dataUrl,
  telefono,
  monto,
  comisionTarjeta,
  onContinue,
}: QrShareCardProps) {
  const link = waLink(telefono)
  const [estado, setEstado] = useState<EnvioEstado>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleEnvioAutomatico = async () => {
    if (!telefono) return
    setError(null)
    setEstado('validando')
    try {
      const { registered } = await checkWhatsAppNumber(telefono)
      if (!registered) {
        setError(WHATSAPP_ERROR_LABEL.numero_sin_whatsapp)
        setEstado('error')
        return
      }
      setEstado('enviando')
      await sendQrByWhatsApp({
        telefono,
        imagenBase64: dataUrl,
        caption: `Hola ${nombre}, aquí está tu código QR de acceso al gimnasio.`,
      })
      setEstado('enviado')
    } catch (err) {
      const key = err instanceof Error ? err.message : 'send_failed'
      setError(WHATSAPP_ERROR_LABEL[key] ?? WHATSAPP_ERROR_LABEL.send_failed)
      setEstado('error')
    }
  }

  return (
    <div className="bg-surface border border-accent/40 rounded-xl p-6 flex flex-col items-center text-center gap-3">
      <CheckCircle2 className="text-accent" size={28} />
      <div>
        <h3 className="text-white font-semibold">Registro guardado</h3>
        <p className="text-sm text-gray-400">Código QR de acceso para {nombre}</p>
      </div>

      {comisionTarjeta != null && monto != null && (
        <div className="w-full bg-surface-2 border border-warning/30 rounded-lg px-3 py-2 text-xs">
          <p className="text-gray-400">
            Monto: <span className="text-white">${monto.toFixed(2)}</span>
          </p>
          <p className="text-warning">Comisión tarjeta: -${comisionTarjeta.toFixed(2)}</p>
          <p className="text-accent font-medium">Te llega: ${(monto - comisionTarjeta).toFixed(2)}</p>
        </div>
      )}

      <img src={dataUrl} alt="Código QR" className="w-48 h-48 rounded-lg border border-border bg-white p-2" />

      <div className="flex flex-wrap justify-center gap-2 mt-1">
        <a
          href={dataUrl}
          download={`qr-${nombre.replace(/\s+/g, '-').toLowerCase()}.png`}
          className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 hover:border-accent/50"
        >
          <Download size={14} /> Descargar QR
        </a>

        {telefono && (
          <button
            type="button"
            onClick={handleEnvioAutomatico}
            disabled={estado === 'validando' || estado === 'enviando' || estado === 'enviado'}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-70"
          >
            {estado === 'validando' || estado === 'enviando' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : estado === 'enviado' ? (
              <CheckCircle2 size={14} />
            ) : (
              <Send size={14} />
            )}
            {estado === 'validando' && 'Validando número…'}
            {estado === 'enviando' && 'Enviando…'}
            {estado === 'enviado' && 'QR enviado'}
            {(estado === 'idle' || estado === 'error') && 'Enviar QR por WhatsApp'}
          </button>
        )}

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 hover:border-accent/50"
          >
            <MessageCircle size={14} /> Abrir chat manual
          </a>
        ) : (
          <span className="text-xs text-gray-500 self-center">Sin teléfono válido para WhatsApp</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 max-w-xs">
          {error} Puedes usar "Abrir chat manual" y adjuntar el QR descargado.
        </div>
      )}

      {estado !== 'enviado' && (
        <p className="text-xs text-gray-500 max-w-xs">
          El envío automático valida que el número tenga WhatsApp (+52 o +521) antes de mandar la imagen. Si el
          servicio de WhatsApp está desconectado, usa el chat manual y adjunta el QR descargado.
        </p>
      )}

      <button onClick={onContinue} className="text-sm text-gray-400 hover:text-white mt-2">
        Continuar →
      </button>
    </div>
  )
}
