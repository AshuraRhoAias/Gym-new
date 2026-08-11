import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { abrirComprobante } from '../lib/crypto'
import type { ComprobanteCfdi } from '../types/database'

const BUCKET = 'comprobantes-financieros'

type ComprobanteFields = Pick<ComprobanteCfdi, 'comprobante_path' | 'comprobante_iv' | 'comprobante_salt' | 'comprobante_mime'>

/** Botón de solo lectura para abrir un comprobante/CFDI ya adjuntado (usado en el Reporte). */
export default function VerComprobante({ comprobante }: { comprobante: ComprobanteFields }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!comprobante.comprobante_path || !comprobante.comprobante_iv || !comprobante.comprobante_salt) {
    return <span className="text-xs text-gray-600">Sin comprobante</span>
  }

  const handleView = async () => {
    setLoading(true)
    setError(null)
    try {
      await abrirComprobante(BUCKET, {
        comprobante_path: comprobante.comprobante_path!,
        comprobante_iv: comprobante.comprobante_iv!,
        comprobante_salt: comprobante.comprobante_salt!,
        comprobante_mime: comprobante.comprobante_mime,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleView}
        disabled={loading}
        className="flex items-center gap-1 text-xs bg-surface-2 border border-border rounded-md px-2 py-1 text-gray-300 hover:border-accent/50 disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
        Ver
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
