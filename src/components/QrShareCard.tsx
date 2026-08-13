import { useState } from 'react'
import { Download, MessageCircle, CheckCircle2, Loader2, Send, Plus } from 'lucide-react'
import { checkWhatsAppNumber, sendQrByWhatsApp, WHATSAPP_ERROR_LABEL } from '../lib/whatsappService'

interface QrShareCardProps {
  nombre: string
  dataUrl: string
  telefono: string | null
  monto?: number | null
  comisionTarjeta?: number | null
  onContinue: () => void
  /** Cuando se pasa, se muestra un botón adicional para volver al formulario en blanco sin salir de la página. */
  onRegisterAnother?: () => void
  registerAnotherLabel?: string
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
  onRegisterAnother,
  registerAnotherLabel,
}: QrShareCardProps) {
  const link = waLink(telefono)
  const [estado, setEstado] = useState<EnvioEstado>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleEnvioAutomatico = async () => {
    if (!telefono) return
    console.log(`[whatsapp:click] ${new Date().toISOString()} clic en "Enviar QR por WhatsApp" (${nombre}, ${telefono})`)
    setError(null)
    setEstado('validando')
    try {
      const { registered } = await checkWhatsAppNumber(telefono).catch((err) => {
        console.log(`[whatsapp:click] ${new Date().toISOString()} checkWhatsAppNumber falló, se intenta enviar igual:`, err)
        return { registered: false, jid: null }
      })
      if (!registered) {
        // No se bloquea el envío por esto: la validación de onWhatsApp puede dar
        // falsos negativos, así que igual se intenta mandar el QR.
        console.log(`[whatsapp:click] ${new Date().toISOString()} número no confirmado como registrado, se intenta enviar igual`)
      }
      setEstado('enviando')
      await sendQrByWhatsApp({
        telefono,
        imagenBase64: dataUrl,
        caption: `Hola ${nombre}, aquí está tu código QR de acceso al gimnasio.`,
      })
      console.log(`[whatsapp:click] ${new Date().toISOString()} envío completado`)
      setEstado('enviado')
    } catch (err) {
      const key = err instanceof Error ? err.message : 'send_failed'
      console.log(`[whatsapp:click] ${new Date().toISOString()} error:`, key)
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

      <img src={dataUrl} alt="Pase de acceso con código QR" className="w-48 h-auto rounded-lg border border-border" />

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

      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {onRegisterAnother && (
          <button
            onClick={onRegisterAnother}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus size={14} /> {registerAnotherLabel ?? 'Registrar otra'}
          </button>
        )}
        <button onClick={onContinue} className="text-sm text-gray-400 hover:text-white">
          Continuar →
        </button>
      </div>
    </div>
  )
}
