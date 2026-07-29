import { Download, MessageCircle, CheckCircle2 } from 'lucide-react'

interface QrShareCardProps {
  nombre: string
  dataUrl: string
  telefono: string | null
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

export default function QrShareCard({ nombre, dataUrl, telefono, onContinue }: QrShareCardProps) {
  const link = waLink(telefono)

  return (
    <div className="bg-surface border border-accent/40 rounded-xl p-6 flex flex-col items-center text-center gap-3">
      <CheckCircle2 className="text-accent" size={28} />
      <div>
        <h3 className="text-white font-semibold">Registro guardado</h3>
        <p className="text-sm text-gray-400">Código QR de acceso para {nombre}</p>
      </div>

      <img src={dataUrl} alt="Código QR" className="w-48 h-48 rounded-lg border border-border bg-white p-2" />

      <p className="text-xs text-gray-500 max-w-xs">
        El QR contiene el identificador del registro cifrado (AES-256-GCM); el Scanner lo descifra al
        leerlo. WhatsApp no permite adjuntar imágenes automáticamente desde un enlace, así que
        descarga el QR y adjúntalo manualmente al chat que se abre.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mt-1">
        <a
          href={dataUrl}
          download={`qr-${nombre.replace(/\s+/g, '-').toLowerCase()}.png`}
          className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 hover:border-accent/50"
        >
          <Download size={14} /> Descargar QR
        </a>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-2 text-sm font-medium"
          >
            <MessageCircle size={14} /> Enviar por WhatsApp
          </a>
        ) : (
          <span className="text-xs text-gray-500 self-center">Sin teléfono válido para WhatsApp</span>
        )}
      </div>

      <button onClick={onContinue} className="text-sm text-gray-400 hover:text-white mt-2">
        Continuar →
      </button>
    </div>
  )
}
