import { useMemo } from 'react'
import { CreditCard, Banknote, Landmark, ClipboardList, Wallet } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import PeriodSelector from '../components/PeriodSelector'

const METHODS = [
  { key: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'border-info text-info' },
  { key: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'border-accent text-accent' },
  { key: 'transferencia', label: 'Transferencia', icon: Landmark, color: 'border-warning text-amber-300' },
  { key: 'otro', label: 'Otros', icon: ClipboardList, color: 'border-purple-500 text-purple-300' },
] as const

export default function PaymentMonitor() {
  const { mes, anio } = usePeriod()
  const { data, loading } = usePeriodRegistros(mes, anio)

  const totals = useMemo(() => {
    const byMethod: Record<string, number> = { tarjeta: 0, efectivo: 0, transferencia: 0, otro: 0, sin_metodo: 0 }
    for (const r of data) byMethod[r.forma_pago] = (byMethod[r.forma_pago] ?? 0) + r.monto
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0)
    return { byMethod, total }
  }, [data])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Monitor de Pagos</h1>
            <p className="text-sm text-gray-400">Consulta y monitorea los ingresos por periodo</p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div className="bg-gradient-to-br from-accent/30 to-info/20 border border-accent/30 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-300 mb-1">Total Recaudado</p>
            <p className="text-5xl font-bold text-white">${totals.total.toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-1">{mes}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METHODS.map((m) => {
              const amount = totals.byMethod[m.key] ?? 0
              const pct = totals.total > 0 ? (amount / totals.total) * 100 : 0
              const Icon = m.icon
              return (
                <div key={m.key} className={`bg-surface border-l-4 ${m.color} border-t border-r border-b border-border rounded-lg p-4`}>
                  <div className="flex items-center gap-2 text-gray-300 mb-2">
                    <Icon size={16} className={m.color.split(' ')[1]} />
                    <span className="text-sm">{m.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">${amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% del total</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
