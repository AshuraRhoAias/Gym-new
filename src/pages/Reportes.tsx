import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePrivacy, tieneFolio } from '../context/PrivacyContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import PeriodSelector from '../components/PeriodSelector'
import MiniStat from '../components/MiniStat'
import StatusBadge from '../components/StatusBadge'
import Masked from '../components/Masked'
import MaskedCount from '../components/MaskedCount'
import { PAGO_LABEL } from '../types/database'

export default function Reportes() {
  const { mes, anio } = usePeriod()
  const { hideSinFolio } = usePrivacy()
  const { data: dataCompleta, loading } = usePeriodRegistros(mes, anio)

  const data = useMemo(
    () => (hideSinFolio ? dataCompleta.filter((r) => tieneFolio(r.folio)) : dataCompleta),
    [dataCompleta, hideSinFolio],
  )

  const stats = useMemo(() => {
    const bachilleres = data.filter((r) => r.bachillerato)
    const faltanDoc = data.filter((r) => r.estatus === 'faltan_doc')
    const tramitarHoja = data.filter((r) => r.estatus === 'tramitar_hoja')
    const completados = data.filter((r) => r.estatus === 'completo' || r.estatus === 'entregado')
    const entregados = data.filter((r) => r.estatus === 'entregado')
    const pendientes = data.filter((r) => r.estatus === 'pendiente')
    return { bachilleres, faltanDoc, tramitarHoja, completados, entregados, pendientes }
  }, [data])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Reportes del Sistema</h1>
            <p className="text-sm text-gray-400">Genera reportes filtrados por mes y año</p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <MiniStat label="Total General" value={<MaskedCount value={data.length} />} color="purple" />
            <MiniStat label="Bachilleres" value={<MaskedCount value={stats.bachilleres.length} />} color="violet" />
            <MiniStat label="Faltan Doc" value={<MaskedCount value={stats.faltanDoc.length} />} color="red" />
            <MiniStat label="Tramitar Hoja" value={<MaskedCount value={stats.tramitarHoja.length} />} color="amber" />
            <MiniStat label="Completados" value={<MaskedCount value={stats.completados.length} />} color="blue" />
            <MiniStat label="Entregados" value={<MaskedCount value={stats.entregados.length} />} color="green" />
            <MiniStat label="Pendientes" value={<MaskedCount value={stats.pendientes.length} />} color="orange" />
          </div>

          <ReportSection title="Convenio con Bachilleres (PRIORIDAD ABSOLUTA)" color="purple" rows={stats.bachilleres} />
          <ReportSection title="Faltan Documentos (PRIORIDAD ALTA)" color="red" rows={stats.faltanDoc} />
          <ReportSection title="Tramitar Hoja" color="amber" rows={stats.tramitarHoja} />
          <ReportSection title="Completados" color="blue" rows={stats.completados} />
        </>
      )}
    </div>
  )
}

function ReportSection({
  title,
  color,
  rows,
}: {
  title: string
  color: 'purple' | 'red' | 'amber' | 'blue'
  rows: ReturnType<typeof usePeriodRegistros>['data']
}) {
  const headerColor: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-200',
    red: 'bg-danger/20 text-red-200',
    amber: 'bg-warning/20 text-amber-200',
    blue: 'bg-info/20 text-blue-200',
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2.5 ${headerColor[color]}`}>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs bg-black/20 rounded-full px-2 py-0.5">
          <MaskedCount value={rows.length} />
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No hay datos para mostrar</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Nombre</th>
                <th className="px-4 py-2 font-normal">Folio</th>
                <th className="px-4 py-2 font-normal">Estatus</th>
                <th className="px-4 py-2 font-normal">Fecha</th>
                <th className="px-4 py-2 font-normal">Atendido por</th>
                <th className="px-4 py-2 font-normal">Método</th>
                <th className="px-4 py-2 font-normal">Monto</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-white">
                    <Masked folio={r.folio} value={r.nombre} />
                  </td>
                  <td className="px-4 py-2 text-gray-300">{r.folio || '0'}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.estatus} />
                  </td>
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{r.atendido_por || '—'}</td>
                  <td className="px-4 py-2 text-gray-300">{PAGO_LABEL[r.forma_pago]}</td>
                  <td className="px-4 py-2 text-gray-200">
                    {r.monto === null ? <span className="text-gray-600">Oculto</span> : `$${r.monto.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
