import { useState, type FormEvent } from 'react'
import { Receipt, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ComprobanteCfdiField from '../ComprobanteCfdiField'
import { CATEGORIA_GASTO_LABEL, type CategoriaGasto, type GastoOperativo } from '../../types/database'

export default function GastosTab({
  mes,
  anio,
  gastos,
  onChanged,
}: {
  mes: string
  anio: number
  gastos: GastoOperativo[]
  onChanged: () => void
}) {
  const { username } = useAuth()
  const [categoria, setCategoria] = useState<CategoriaGasto>('papeleria')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPorCategoria = new Map<CategoriaGasto, number>()
  for (const g of gastos) totalPorCategoria.set(g.categoria, (totalPorCategoria.get(g.categoria) ?? 0) + g.monto)
  const total = gastos.reduce((s, g) => s + g.monto, 0)
  const sinCfdi = gastos.filter((g) => !g.tiene_cfdi)

  const handleAgregar = async (e: FormEvent) => {
    e.preventDefault()
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('gastos_operativos').insert({
      mes,
      anio,
      categoria,
      descripcion: descripcion.trim() || null,
      monto: montoNum,
      tiene_cfdi: false,
      created_by: username,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setDescripcion('')
    setMonto('')
    onChanged()
  }

  const handleBorrar = async (id: string) => {
    if (!confirm('¿Borrar este gasto?')) return
    await supabase.from('gastos_operativos').delete().eq('id', id)
    onChanged()
  }

  const updateGasto = async (id: string, patch: Partial<GastoOperativo>) => {
    await supabase.from('gastos_operativos').update(patch).eq('id', id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAgregar} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Receipt size={15} /> Registrar gasto operativo — {mes} {anio}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {Object.entries(CATEGORIA_GASTO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={categoria === 'otros' ? 'Describe el gasto…' : 'Descripción (opcional)'}
            className="col-span-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <input
            required
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
        <p className="text-xs text-gray-500">
          El CFDI/comprobante (folio y foto) se adjunta después, directamente en la fila de la tabla.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Agregar gasto'}
        </button>
      </form>

      {error && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {Object.entries(CATEGORIA_GASTO_LABEL).map(([v, l]) => (
          <div key={v} className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">${(totalPorCategoria.get(v as CategoriaGasto) ?? 0).toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-white">Gastos del periodo — total: ${total.toFixed(2)}</span>
          {sinCfdi.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-md bg-warning/15 text-amber-300">
              {sinCfdi.length} sin comprobante fiscal
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Categoría</th>
                <th className="px-4 py-2 font-normal">Descripción</th>
                <th className="px-4 py-2 font-normal">Monto</th>
                <th className="px-4 py-2 font-normal">CFDI / comprobante (para el SAT)</th>
                <th className="px-4 py-2 font-normal text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-white whitespace-nowrap">{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
                  <td className="px-4 py-2 text-gray-300">{g.descripcion || '—'}</td>
                  <td className="px-4 py-2 text-gray-200 whitespace-nowrap">${g.monto.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 mb-1.5">
                      <input
                        type="checkbox"
                        checked={g.tiene_cfdi}
                        onChange={(e) => updateGasto(g.id, { tiene_cfdi: e.target.checked })}
                      />
                      Tiene CFDI
                    </label>
                    {g.tiene_cfdi && (
                      <ComprobanteCfdiField
                        folio={g.folio_comprobante ?? ''}
                        onFolioChange={(v) => updateGasto(g.id, { folio_comprobante: v || null })}
                        comprobante={{
                          comprobante_path: g.comprobante_path,
                          comprobante_iv: g.comprobante_iv,
                          comprobante_salt: g.comprobante_salt,
                          comprobante_mime: g.comprobante_mime,
                        }}
                        onComprobanteChange={(v) => updateGasto(g.id, v)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleBorrar(g.id)} className="text-gray-500 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Sin gastos registrados este periodo.
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
