import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import PeriodSelector from '../components/PeriodSelector'
import StatusBadge from '../components/StatusBadge'
import PhoneReveal from '../components/PhoneReveal'
import { PAGO_LABEL } from '../types/database'

export default function Completos() {
  const { mes, anio } = usePeriod()
  const { data, loading } = usePeriodRegistros(mes, anio)
  const [search, setSearch] = useState('')

  const completos = useMemo(
    () => data.filter((r) => r.estatus === 'completo' || r.estatus === 'entregado'),
    [data],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return completos
    const q = search.toLowerCase()
    return completos.filter((r) => r.nombre.toLowerCase().includes(q) || (r.folio ?? '').toLowerCase().includes(q))
  }, [completos, search])

  const montoOculto = completos.some((r) => r.monto === null)
  const montoTotal = useMemo(() => completos.reduce((s, r) => s + (r.monto ?? 0), 0), [completos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Registros Completados</h1>
            <p className="text-sm text-gray-400">Registros con estatus completo o entregado</p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-accent/40 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-accent">{completos.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Completados</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {completos.filter((r) => r.kind.startsWith('renovacion')).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Renovaciones</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {montoOculto ? 'Oculto' : `$${montoTotal.toFixed(2)}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">Monto Total</div>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nombre, folio, teléfono…"
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent w-64"
      />

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading && <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin registros completados para este periodo.</p>
        )}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="px-4 py-2 font-normal">Tipo</th>
                  <th className="px-4 py-2 font-normal">Nombre</th>
                  <th className="px-4 py-2 font-normal">Folio</th>
                  <th className="px-4 py-2 font-normal">Método</th>
                  <th className="px-4 py-2 font-normal">Monto</th>
                  <th className="px-4 py-2 font-normal">Estatus</th>
                  <th className="px-4 py-2 font-normal">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-gray-300 whitespace-nowrap">
                      {r.kind.startsWith('inscripcion') ? 'Inscripción' : 'Renovación'}
                    </td>
                    <td className="px-4 py-2 text-white">{r.nombre}</td>
                    <td className="px-4 py-2 text-gray-300">{r.folio || '0'}</td>
                    <td className="px-4 py-2 text-gray-300">{PAGO_LABEL[r.forma_pago]}</td>
                    <td className="px-4 py-2 text-gray-200">
                      {r.monto === null ? <span className="text-gray-600">Oculto</span> : `$${r.monto.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.estatus} />
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      <PhoneReveal cipher={r.telefono} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
