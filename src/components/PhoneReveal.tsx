import { useState } from 'react'
import { Loader2, Phone } from 'lucide-react'
import { decryptText } from '../lib/crypto'

/** Muestra "Ver teléfono" y descifra bajo demanda; evita descifrar filas completas de una lista al cargar. */
export default function PhoneReveal({ cipher }: { cipher: string | null }) {
  const [value, setValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!cipher) return <span>—</span>
  if (value !== null) return <span>{value}</span>

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async (e) => {
        e.stopPropagation()
        setLoading(true)
        setValue(await decryptText(cipher))
        setLoading(false)
      }}
      className="inline-flex items-center gap-1 text-gray-400 hover:text-accent"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Phone size={11} />}
      {loading ? 'Descifrando…' : 'Ver teléfono'}
    </button>
  )
}
