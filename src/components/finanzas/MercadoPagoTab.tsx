import { useState, type FormEvent } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { comisionMonto, montoNeto } from '../../lib/finanzas'
import type { MercadoPagoCobro } from '../../types/database'

export default function MercadoPagoTab({
  mes,
  anio,
  cobros,
  onChanged,
}: {
  mes: string
  anio: number
  cobros: MercadoPagoCobro[]
  onChanged: () => void
}) {
  const { username } = useAuth()
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [concepto, setConcepto] = useState('')
  const [montoBruto, setMontoBruto] = useState('')
  const [comisionPct, setComisionPct] = useState('3.5')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBruto = cobros.reduce((s, c) => s + c.monto_bruto, 0)
  const totalComision = cobros.reduce((s, c) => s + comisionMonto(c), 0)
  const totalNeto = cobros.reduce((s, c) => s + montoNeto(c), 0)

  const handleAgregar = async (e: FormEvent) => {
    e.preventDefault()
    const bruto = Number(montoBruto)
    if (!bruto || bruto <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('mercadopago_cobros').insert({
      mes,
      anio,
      fecha,
      concepto: concepto.trim() || null,
      monto_bruto: bruto,
      comision_pct: Number(comisionPct) || 0,
      created_by: username,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setConcepto('')
    setMontoBruto('')
    onChanged()
  }

  const handleBorrar = async (id: string) => {
    if (!confirm('¿Borrar este cobro?')) return
    await supabase.from('mercadopago_cobros').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAgregar} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <CreditCard size={15} /> Registrar cobro con Mercado Pago (Point) — {mes} {anio}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Concepto (opcional)"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <input
            required
            type="number"
            step="0.01"
            value={montoBruto}
            onChange={(e) => setMontoBruto(e.target.value)}
            placeholder="Monto cobrado"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <input
            type="number"
            step="0.01"
            value={comisionPct}
            onChange={(e) => setComisionPct(e.target.value)}
            placeholder="% comisión"
            title="Porcentaje que Mercado Pago descuenta por el cobro en Point"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          <Plus size={13} /> {saving ? 'Guardando…' : 'Registrar cobro'}
        </button>
      </form>

      {error && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-white">${totalBruto.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Total cobrado (bruto)</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-warning">-${totalComision.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Comisión Mercado Pago</div>
        </div>
        <div className="bg-surface border border-accent/40 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-accent">${totalNeto.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Total neto recibido</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">
          Cobros del periodo — {mes} {anio}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Fecha</th>
                <th className="px-4 py-2 font-normal">Concepto</th>
                <th className="px-4 py-2 font-normal">Bruto</th>
                <th className="px-4 py-2 font-normal">% Comisión</th>
                <th className="px-4 py-2 font-normal">Comisión</th>
                <th className="px-4 py-2 font-normal">Neto</th>
                <th className="px-4 py-2 font-normal text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cobros.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-gray-300">{c.concepto || '—'}</td>
                  <td className="px-4 py-2 text-white">${c.monto_bruto.toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-400">{c.comision_pct.toFixed(2)}%</td>
                  <td className="px-4 py-2 text-warning">-${comisionMonto(c).toFixed(2)}</td>
                  <td className="px-4 py-2 text-accent">${montoNeto(c).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleBorrar(c.id)} className="text-gray-500 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {cobros.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Sin cobros registrados este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
