import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import { PAGO_LABEL, type CajaMovimiento } from '../types/database'

export default function CajaVisitas() {
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('caja_movimientos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(200)
    setMovimientos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const totals = useMemo(() => {
    const visitas = movimientos.filter((m) => m.kind === 'visita').reduce((s, m) => s + m.monto, 0)
    const gastos = movimientos.filter((m) => m.kind === 'gasto').reduce((s, m) => s + m.monto, 0)
    const tomados = movimientos.filter((m) => m.kind === 'tomado_caja').reduce((s, m) => s + m.monto, 0)
    return { visitas, gastos, tomados, balance: visitas - tomados }
  }, [movimientos])

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, CajaMovimiento[]>()
    for (const m of movimientos) {
      const day = new Date(m.fecha).toLocaleDateString()
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(m)
    }
    return Array.from(groups.entries())
  }, [movimientos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white text-center w-full sm:w-auto">
          Sistema de Control de Caja
        </h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-gray-200 hover:border-accent/50"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <Link
            to="/registros-visitas"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus size={14} /> Nueva Visita
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Visitas" value={`$${totals.visitas.toFixed(2)}`} icon={RefreshCw} accent="text-accent" />
        <StatCard label="Tomados de Caja" value={`$${totals.tomados.toFixed(2)}`} icon={RefreshCw} accent="text-info" />
        <StatCard label="Balance de Caja" value={`$${totals.balance.toFixed(2)}`} icon={RefreshCw} accent="text-accent" />
        <StatCard label="Gastos Registrados" value={`$${totals.gastos.toFixed(2)}`} icon={RefreshCw} accent="text-danger" />
      </div>

      <div className="bg-surface border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-white">Historial de Visitas</h2>
        </div>

        {loading && <div className="px-5 py-8 text-center text-gray-500 text-sm">Cargando…</div>}
        {!loading && groupedByDay.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">Sin movimientos registrados.</div>
        )}

        <div className="divide-y divide-border">
          {groupedByDay.map(([day, rows]) => {
            const dayTotal = rows.reduce((s, r) => s + (r.kind === 'visita' ? r.monto : 0), 0)
            return (
              <div key={day} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{day}</span>
                  <span className="text-sm text-accent">Total del día: ${dayTotal.toFixed(2)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1.5 pr-4 font-normal">Hora</th>
                        <th className="py-1.5 pr-4 font-normal">Usuario</th>
                        <th className="py-1.5 pr-4 font-normal">Tipo</th>
                        <th className="py-1.5 pr-4 font-normal">Monto</th>
                        <th className="py-1.5 pr-4 font-normal">Método</th>
                        <th className="py-1.5 font-normal">Concepto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-border/50">
                          <td className="py-1.5 pr-4 text-gray-400 whitespace-nowrap">
                            {new Date(r.fecha).toLocaleTimeString()}
                          </td>
                          <td className="py-1.5 pr-4 text-gray-300">{r.usuario}</td>
                          <td className="py-1.5 pr-4 text-accent">{r.kind}</td>
                          <td className="py-1.5 pr-4 text-gray-200">${r.monto.toFixed(2)}</td>
                          <td className="py-1.5 pr-4 text-gray-400">{PAGO_LABEL[r.metodo_pago]}</td>
                          <td className="py-1.5 text-gray-400">{r.concepto || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
