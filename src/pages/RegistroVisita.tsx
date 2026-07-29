import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { MovementKind, PaymentMethod } from '../types/database'

const TIPOS: { key: MovementKind; title: string; hint: string }[] = [
  { key: 'visita', title: 'Visita', hint: 'Ingreso por cliente' },
  { key: 'gasto', title: 'Gasto', hint: 'Gasto del negocio' },
  { key: 'tomado_caja', title: 'Tomado de Caja', hint: 'Retiro personal' },
]

export default function RegistroVisita() {
  const { username } = useAuth()
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<MovementKind>('visita')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<PaymentMethod>('efectivo')
  const [concepto, setConcepto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = new Date()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('caja_movimientos').insert({
      kind: tipo,
      usuario: username ?? 'desconocido',
      monto: Number(monto) || 0,
      metodo_pago: metodo,
      concepto: concepto.trim() || null,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    navigate('/caja-visitas')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border text-center">
          <h1 className="text-lg font-semibold text-white">Registro de Visita</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-border">
          <div>
            <div className="text-xs text-gray-500">Fecha:</div>
            <div className="text-sm text-gray-200">{now.toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Hora:</div>
            <div className="text-sm text-gray-200">{now.toLocaleTimeString()}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Usuario:</label>
            <input
              disabled
              value={username ?? ''}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Monto Total ($):</label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Tipo de Movimiento:</label>
            <div className="flex flex-col gap-2">
              {TIPOS.map((t) => (
                <label
                  key={t.key}
                  className={`flex flex-col rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    tipo === t.key
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-surface-2 hover:border-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipo === t.key}
                      onChange={() => setTipo(t.key)}
                      className="accent-accent"
                    />
                    {t.title}
                  </span>
                  <span className="text-xs text-gray-500 pl-6">{t.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Método de Pago:</label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Concepto (opcional):</label>
            <textarea
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Detalle de la visita…"
              rows={3}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-dark disabled:opacity-60 text-black font-medium rounded-lg py-2.5 text-sm"
          >
            {saving ? 'Guardando…' : 'Registrar Visita'}
          </button>
        </form>
      </div>
    </div>
  )
}
