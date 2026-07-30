import { useMemo, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import { useAuth } from '../context/AuthContext'
import { canSeeMoney } from '../lib/permissions'
import PeriodSelector from '../components/PeriodSelector'
import { PAGO_LABEL } from '../types/database'

const AUTOGENERADO_INSCRIPCION = 287
const AUTOGENERADO_RENOVACION = 124

export default function Enum() {
  const { mes, anio } = usePeriod()
  const { role } = useAuth()
  const { data, loading } = usePeriodRegistros(mes, anio)
  const [search, setSearch] = useState('')
  const showMoney = canSeeMoney(role)

  const withFolio = useMemo(() => data.filter((r) => r.folio && r.folio !== '0'), [data])
  const sinFolio = useMemo(() => data.filter((r) => !r.folio || r.folio === '0'), [data])

  const autogenerado = (kind: string) =>
    kind.startsWith('inscripcion') ? AUTOGENERADO_INSCRIPCION : AUTOGENERADO_RENOVACION

  const totales = useMemo(() => {
    const totalConFolio = withFolio.reduce((s, r) => s + (r.monto ?? 0), 0)
    const totalSinFolio = sinFolio.reduce((s, r) => s + (r.monto ?? 0), 0)
    const ganancia = withFolio.reduce((s, r) => s + ((r.monto ?? 0) - autogenerado(r.kind)), 0)
    return { totalConFolio, totalSinFolio, ganancia }
  }, [withFolio, sinFolio])

  const filtered = useMemo(() => {
    if (!search.trim()) return withFolio
    const q = search.toLowerCase()
    return withFolio.filter((r) => r.nombre.toLowerCase().includes(q) || (r.folio ?? '').toLowerCase().includes(q))
  }, [withFolio, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-accent" size={22} />
          <h1 className="text-2xl font-semibold text-white">Reportes con Enumeración</h1>
        </div>
        <PeriodSelector />
      </div>

      {!showMoney && (
        <p className="text-xs text-gray-500 bg-surface border border-border rounded-lg px-3 py-2">
          Tu rol solo puede ver nombres y folios en este reporte; los montos están ocultos.
        </p>
      )}

      {showMoney && (
        <div className="bg-surface border border-border rounded-xl p-4 text-xs text-gray-400 space-y-1">
          <p>⚙️ Autogenerado Inscripciones: ${AUTOGENERADO_INSCRIPCION.toFixed(2)}</p>
          <p>⚙️ Autogenerado Renovaciones: ${AUTOGENERADO_RENOVACION.toFixed(2)}</p>
          <p>Fórmula Saldo: monto - autogenerado</p>
          <p className="text-gray-500">Nota: Los registros sin folio no tienen autogenerado, solo se suma el monto total.</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Total Con Folio" value={withFolio.length} />
            <Stat label="Total Sin Folio" value={sinFolio.length} warn />
            {showMoney && (
              <>
                <Stat label="Total General Con Folio" value={`$${totales.totalConFolio.toFixed(2)}`} />
                <Stat label="Ganancia Final" value={`$${totales.ganancia.toFixed(2)}`} accent />
              </>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o folio…"
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent w-80 max-w-full"
          />

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Registros CON FOLIO</span>
              <span className="text-xs text-gray-400">{filtered.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-border">
                    <th className="px-4 py-2 font-normal">Nombre</th>
                    <th className="px-4 py-2 font-normal">Folio</th>
                    {showMoney && (
                      <>
                        <th className="px-4 py-2 font-normal">Monto</th>
                        <th className="px-4 py-2 font-normal">Autogenerado</th>
                        <th className="px-4 py-2 font-normal">Saldo</th>
                        <th className="px-4 py-2 font-normal">Método</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((r) => {
                    const auto = autogenerado(r.kind)
                    const saldo = (r.monto ?? 0) - auto
                    return (
                      <tr key={r.id} className="border-b border-border/50">
                        <td className="px-4 py-2 text-white">{r.nombre}</td>
                        <td className="px-4 py-2 text-gray-300">{r.folio}</td>
                        {showMoney && (
                          <>
                            <td className="px-4 py-2 text-gray-200">${(r.monto ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-gray-400">${auto.toFixed(2)}</td>
                            <td className={`px-4 py-2 ${saldo < 0 ? 'text-danger' : 'text-accent'}`}>
                              ${saldo.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-gray-400">{PAGO_LABEL[r.forma_pago]}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent, warn }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${accent ? 'text-accent' : warn ? 'text-warning' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
