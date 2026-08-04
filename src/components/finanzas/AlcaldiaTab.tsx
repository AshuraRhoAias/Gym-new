import { useState, type FormEvent } from 'react'
import { Landmark, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ComprobanteCfdiField from '../ComprobanteCfdiField'
import type { AlcaldiaTicket, PagoAlcaldia } from '../../types/database'
import type { IngresoPeriodo } from '../../hooks/useFinanzas'

export default function AlcaldiaTab({
  mes,
  anio,
  pago,
  tickets,
  ingreso,
  onChanged,
}: {
  mes: string
  anio: number
  pago: PagoAlcaldia | undefined
  tickets: AlcaldiaTicket[]
  ingreso: IngresoPeriodo | undefined
  onChanged: () => void
}) {
  const { username } = useAuth()
  const [convenio, setConvenio] = useState(String(pago?.monto_convenio ?? 0))
  const [renta, setRenta] = useState(String(pago?.monto_renta ?? 10000))
  const [cfdi, setCfdi] = useState(pago?.cfdi_recibido ?? false)
  const [saving, setSaving] = useState(false)
  const [folioTicket, setFolioTicket] = useState('')
  const [montoTicket, setMontoTicket] = useState('')
  const [error, setError] = useState<string | null>(null)

  const referenciaConvenio = (ingreso?.tarjeta ?? 0) + (ingreso?.transferencia ?? 0)
  const totalTickets = tickets.reduce((s, t) => s + t.monto, 0)

  const handleGuardar = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      mes,
      anio,
      monto_convenio: Number(convenio) || 0,
      monto_renta: Number(renta) || 0,
      cfdi_recibido: cfdi,
      created_by: username,
    }
    const { error: err } = pago
      ? await supabase.from('pagos_alcaldia').update(payload).eq('id', pago.id)
      : await supabase.from('pagos_alcaldia').insert(payload)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onChanged()
  }

  const handleAgregarTicket = async (e: FormEvent) => {
    e.preventDefault()
    if (!pago) {
      setError('Guarda primero el pago del periodo antes de agregar tickets.')
      return
    }
    const montoNum = Number(montoTicket)
    if (!montoNum || montoNum <= 0) return
    const { error: err } = await supabase.from('alcaldia_tickets').insert({
      pago_alcaldia_id: pago.id,
      folio: folioTicket.trim() || null,
      monto: montoNum,
    })
    if (err) {
      setError(err.message)
      return
    }
    setFolioTicket('')
    setMontoTicket('')
    onChanged()
  }

  const handleBorrarTicket = async (id: string) => {
    await supabase.from('alcaldia_tickets').delete().eq('id', id)
    onChanged()
  }

  const updateComprobante = async (patch: Partial<PagoAlcaldia>) => {
    if (!pago) return
    await supabase.from('pagos_alcaldia').update(patch).eq('id', pago.id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleGuardar} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Landmark size={15} /> Pago a Alcaldía / Convenio (Gaceta DPM Cuajimalpa) — {mes} {anio}
        </h3>
        <p className="text-xs text-gray-500">
          Referencia: ingresos por tarjeta/transferencia de este periodo = ${referenciaConvenio.toFixed(2)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Pago por usuarios en convenio (tarjeta/transferencia)
            <input
              type="number"
              step="0.01"
              value={convenio}
              onChange={(e) => setConvenio(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Renta / uso de espacio a alcaldía
            <input
              type="number"
              step="0.01"
              value={renta}
              onChange={(e) => setRenta(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={cfdi} onChange={(e) => setCfdi(e.target.checked)} />
          ¿Se recibió CFDI de este pago?
        </label>
        <button
          type="submit"
          disabled={saving}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {saving ? 'Guardando…' : pago ? 'Actualizar pago del periodo' : 'Guardar pago del periodo'}
        </button>
      </form>

      {error && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>}

      {pago && cfdi && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Comprobante (folio y foto/PDF) para validar ante el SAT</h3>
          <ComprobanteCfdiField
            folio={pago.folio_comprobante ?? ''}
            onFolioChange={(v) => updateComprobante({ folio_comprobante: v || null })}
            comprobante={{
              comprobante_path: pago.comprobante_path,
              comprobante_iv: pago.comprobante_iv,
              comprobante_salt: pago.comprobante_salt,
              comprobante_mime: pago.comprobante_mime,
            }}
            onComprobanteChange={(v) => updateComprobante(v)}
          />
        </div>
      )}

      {pago && !cfdi && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">
            Tickets de pago (sin CFDI) — total: ${totalTickets.toFixed(2)}
          </div>
          <form onSubmit={handleAgregarTicket} className="flex flex-wrap gap-3 p-4 border-b border-border">
            <input
              value={folioTicket}
              onChange={(e) => setFolioTicket(e.target.value)}
              placeholder="Folio del ticket (opcional)"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <input
              type="number"
              step="0.01"
              value={montoTicket}
              onChange={(e) => setMontoTicket(e.target.value)}
              placeholder="Monto"
              className="w-32 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50"
            >
              <Plus size={13} /> Agregar ticket
            </button>
          </form>
          <div className="divide-y divide-border/50">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-300">{t.folio || 'Sin folio'}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white">${t.monto.toFixed(2)}</span>
                  <button onClick={() => handleBorrarTicket(t.id)} className="text-gray-500 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Sin tickets registrados.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
