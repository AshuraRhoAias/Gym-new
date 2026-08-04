import { AlertTriangle } from 'lucide-react'
import type { ResumenPeriodo } from '../../lib/finanzas'

export default function ResumenCards({ resumen }: { resumen: ResumenPeriodo }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card label="Ingresos (tarjeta/transferencia)" value={resumen.ingresos} accent="text-accent" />
      <Card label="Nómina" value={-resumen.nomina} accent="text-danger" />
      <Card label="Convenio + Renta Alcaldía" value={-(resumen.convenio + resumen.renta)} accent="text-danger" />
      <Card label="Gastos operativos" value={-resumen.gastos} accent="text-danger" />
      <Card label="Comisiones Mercado Pago" value={-resumen.comisionesMp} accent="text-warning" />
      <Card label="Utilidad bruta" value={resumen.utilidadBruta} accent="text-info" strong />
      <Card label="Utilidad neta (tras comisión MP)" value={resumen.utilidadNeta} accent="text-white" strong />
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1.5 text-warning">
          <AlertTriangle size={18} />
          <span className="text-2xl font-bold">{resumen.sinComprobante}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Partidas sin comprobante fiscal</div>
      </div>
    </div>
  )
}

function Card({
  label,
  value,
  accent,
  strong,
}: {
  label: string
  value: number
  accent: string
  strong?: boolean
}) {
  const negative = value < 0
  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <div className={`${strong ? 'text-2xl' : 'text-xl'} font-bold ${negative ? 'text-danger' : accent}`}>
        {negative ? '-' : ''}${Math.abs(value).toFixed(2)}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
